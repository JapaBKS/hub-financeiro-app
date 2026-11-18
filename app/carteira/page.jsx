import { supabaseServer, lerTudo } from '../../lib/supabase';
import { brl, pct } from '../../lib/format';
import { criarResolvedorDePreco } from '../../lib/dominio/precos';
import PrecoManual from '../preco-manual-client';

import { segmento } from '../../lib/dominio/segmentos';
import SaldosClient from './saldos-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// quantidade: inteira sem casas; fracionada (cripto) com até 8 casas, sem zeros à direita
const fmtQtd = (n) => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 8 });
const fmtNum = (n, d = 2) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

export default async function Carteira() {
  const sb = supabaseServer();
  const [{ data: pos }, { data: manuais }, { data: precos }, { data: divs }, { data: resumoTrades }, { data: holdings }, { data: classesTodas }, tradesRes] = await Promise.all([
    sb.from('v_positions').select('*'),
    sb.from('manual_prices').select('ticker, price'),
    sb.from('prices').select('ticker, price, updated_at'),
    sb.from('dividends').select('ticker, amount, paid_at'),
    sb.from('v_resumo_trades').select('*').single(),
    sb.from('manual_holdings').select('id, label, amount, class_id, asset_classes(name)').order('id'),
    sb.from('asset_classes').select('id, name').order('name'),
    lerTudo((de, ate) => sb.from('trades').select('traded_at, side, quantity, assets(ticker)')
      .order('traded_at', { ascending: true }).order('id', { ascending: true }).range(de, ate)),
  ]);
  // saldos lançados à mão (Tesouro, reserva, Mercado Pago…): antes eram a tela Saldos
  const saldosManuais = (holdings || []).map((h) => ({
    id: h.id, label: h.label, amount: h.amount, class_id: h.class_id, classe: h.asset_classes?.name,
  }));
  // "c/ prov." conta só os proventos da posição atual: desde a última vez que a quantidade
  // saiu do zero (quem vendeu tudo e recomprou não herda os proventos da posição antiga)
  const inicioPosicao = {};
  const qtdAte = {};
  (tradesRes?.data || []).forEach((t) => {
    const tk = t.assets?.ticker; if (!tk) return;
    const antes = qtdAte[tk] || 0;
    const depois = antes + (t.side === 'venda' ? -1 : 1) * Number(t.quantity || 0);
    if (antes <= 1e-9 && depois > 1e-9) inicioPosicao[tk] = String(t.traded_at).slice(0, 10);
    qtdAte[tk] = depois;
  });
  const provDe = {};
  (divs || []).forEach((d) => {
    if (!d.ticker) return;
    const desde = inicioPosicao[d.ticker];
    if (desde && String(d.paid_at || '').slice(0, 10) < desde) return;
    provDe[d.ticker] = (provDe[d.ticker] || 0) + (Number(d.amount) || 0);
  });

  const precoDe = criarResolvedorDePreco(precos, manuais);

  // inclui todos; quem não tem cotação usa o PM como valor provisório
  const ativos = (pos || []).map((p) => {
    const resolvido = precoDe(p.ticker, Number(p.preco_medio) || 0);
    const semAuto = resolvido.origem !== 'auto';
    const usouManual = resolvido.origem === 'manual';
    const manual = usouManual ? resolvido.preco : null;
    const semCotacao = resolvido.origem === 'pm' || resolvido.origem === 'nenhum';
    const precoRef = resolvido.preco;
    const valor = Number(p.quantidade) * precoRef;
    // sem cotação (vale o PM) o lucro é zero; com cotação antiga ou manual, compara com o PM
    const lucro = !semAuto ? Number(p.lucro_rs) : (semCotacao ? 0 : valor - Number(p.quantidade) * Number(p.preco_medio));
    const proventos = provDe[p.ticker] || 0;
    return { ...p, semAuto, semCotacao, usouManual, manual, precoRef, valor, lucro, proventos, lucroTotal: lucro + proventos };
  });

  const totalCarteira = ativos.reduce((s, p) => s + p.valor, 0);

  // RESULTADO TOTAL desde o in cio: vendas + valor de hoje + proventos   compras.
  // Inclui posi es j  encerradas, ent o responde "no fim das contas, estou no lucro?".
  const compradoTudo = resumoTrades?.comprado_tudo || 0;
  const vendidoTudo = resumoTrades?.vendido_tudo || 0;
  const proventosTudo = (divs || []).reduce((s2, d) => s2 + (Number(d.amount) || 0), 0);
  const resultadoTotal = vendidoTudo + totalCarteira + proventosTudo - compradoTudo;
  const rentTotalGeral = compradoTudo > 0 ? resultadoTotal / compradoTudo : 0;
  const aguardando = ativos.filter((p) => p.semCotacao).length;

  // agrupa por classe
  const porClasse = {};
  for (const p of ativos) (porClasse[p.classe] ||= []).push(p);

  const subgrupo = (classe) => {
    const lista = (porClasse[classe] || []).slice().sort((a, b) => a.ticker.localeCompare(b.ticker));
    return { classe, lista, total: lista.reduce((s, p) => s + p.valor, 0) };
  };

  // Renda Variável = Ações BR + BDRs (duas listas, total somado, como na Rico)
  const RV = ['Ações BR', 'BDRS'];
  const blocos = [];
  const rvSubs = RV.filter((c) => porClasse[c]).map(subgrupo);
  if (rvSubs.length) {
    blocos.push({ titulo: 'Renda Variável', subgrupos: rvSubs, total: rvSubs.reduce((s, g) => s + g.total, 0) });
  }
  for (const classe of Object.keys(porClasse)) {
    if (RV.includes(classe)) continue;
    const g = subgrupo(classe);
    blocos.push({ titulo: classe, subgrupos: [g], total: g.total });
  }
  blocos.sort((a, b) => b.total - a.total);

  const corLucro = (v) => (v >= 0 ? 'var(--up)' : 'var(--down)');

  const Linha = (p) => {
    const investido = p.valor - p.lucro;
    const rent = investido > 0 ? p.lucro / investido : 0;
    return (
      <div key={p.ticker} style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
        borderBottom: '1px solid var(--line-soft)',
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{p.ticker}</b>
            {segmento(p.ticker) && <span className="seg">{segmento(p.ticker)}</span>}
            {p.usouManual && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--forest-2)', background: 'var(--up-bg)', borderRadius: 5, padding: '1px 6px' }}>preço manual</span>
            )}
            {p.semCotacao && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--amber)', background: 'var(--amber-bg)', borderRadius: 5, padding: '1px 6px' }}>aguardando cotação</span>
            )}
            {!p.semCotacao && p.mais_barato && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--up)', background: 'var(--up-bg)', borderRadius: 5, padding: '1px 6px' }}>abaixo do PM</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2, fontFamily: 'var(--font-display)' }}>
            {fmtQtd(p.quantidade)} · PM {fmtNum(p.preco_medio)}
            {p.semAuto ? (p.usouManual ? ` · manual ${fmtNum(p.manual)}` : '') : ` · agora ${fmtNum(p.preco_atual)}`}
          </div>
          {p.semAuto && (
            <div style={{ marginTop: 5 }}><PrecoManual ticker={p.ticker} valor={p.manual} /></div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>{brl(p.valor)}</div>
          {p.semCotacao ? (
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>pelo PM</div>
          ) : (
            <div style={{ fontSize: 11.5, fontFamily: 'var(--font-display)', fontWeight: 600, color: corLucro(p.lucro), marginTop: 2 }}>
              {p.lucro >= 0 ? '+' : ''}{pct(rent)}
            </div>
          )}
          {p.proventos > 0 && (
            <div title="valorização + proventos recebidos"
              style={{ fontSize: 10.5, fontFamily: 'var(--font-display)', color: corLucro(p.lucroTotal), marginTop: 1 }}>
              c/ prov. {p.lucroTotal >= 0 ? '+' : ''}{brl(p.lucroTotal)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <header className="topbar">
        <div className="brand">
          <div><b>Carteira</b><span>{ativos.length} ativos{aguardando > 0 ? ` · ${aguardando} s/ cotação` : ''}</span></div>
        </div>
        <a href="/negociacoes">+ negociação</a>
      </header>

      {/* um número só: o resultado de verdade desde o início (vendas + valor de hoje + proventos − compras).
          O antigo "lucro · valorização" olhava só as posições atuais contra o PM e deixava de fora o
          que você já realizou vendendo e os proventos, por isso aparecia negativo com o total positivo. */}
      <section className="card cart-resumo" style={{ borderLeft: `3px solid ${resultadoTotal >= 0 ? 'var(--up)' : 'var(--down)'}` }}>
        <div className="cart-resumo-topo">
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Resultado desde o início</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, letterSpacing: '-.02em', color: corLucro(resultadoTotal) }}>
              {resultadoTotal >= 0 ? '+' : ''}{brl(resultadoTotal)} <small style={{ fontSize: 15 }}>{pct(rentTotalGeral)}</small>
            </div>
          </div>
          <div className="cart-resumo-valor">
            <div className="eyebrow" style={{ marginBottom: 3 }}>Valor da carteira</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>{brl(totalCarteira)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 10, fontSize: 11.5, color: 'var(--ink-faint)' }}>
          <span>comprei <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink-soft)' }}>{brl(compradoTudo)}</b></span>
          <span>vendi <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink-soft)' }}>{brl(vendidoTudo)}</b></span>
          <span>tenho hoje <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink-soft)' }}>{brl(totalCarteira)}</b></span>
          <span>proventos <b style={{ fontFamily: 'var(--font-display)', color: 'var(--brass)' }}>{brl(proventosTudo)}</b></span>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 8 }}>
          Vendi + tenho hoje + proventos − comprei. Inclui o que você já realizou vendendo e as posições encerradas; não considera corretagem nem imposto pago.
        </div>
      </section>

      {blocos.map((bloco) => (
        <section className="card" key={bloco.titulo} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '15px 20px', borderBottom: '1px solid var(--line-soft)' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{bloco.titulo}</h2>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', fontSize: 14 }}>{brl(bloco.total)}</b>
              {' · '}{pct(totalCarteira > 0 ? bloco.total / totalCarteira : 0)} da carteira
            </div>
          </div>

          {bloco.subgrupos.map((g) => (
            <div key={g.classe}>
              {bloco.subgrupos.length > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)' }}>{g.classe}</span>
                  <span style={{ fontSize: 11.5, fontFamily: 'var(--font-display)', color: 'var(--ink-faint)' }}>{brl(g.total)}</span>
                </div>
              )}
              {g.lista.map((p) => Linha(p))}
            </div>
          ))}
        </section>
      ))}

      {ativos.length === 0 && (
        <div className="card" style={{ padding: 20, fontSize: 13, color: 'var(--ink-faint)' }}>Nenhuma posição no momento.</div>
      )}

      <section id="saldos" style={{ marginTop: 22, scrollMarginTop: 80 }}>
        <h2 className="secao-titulo">Saldos manuais</h2>
        <p className="secao-sub">Tesouro, fundos, reserva, Mercado Pago… o que não vem das negociações.</p>
        <SaldosClient holdings={saldosManuais} classes={classesTodas || []} />
      </section>
    </div>
  );
}
