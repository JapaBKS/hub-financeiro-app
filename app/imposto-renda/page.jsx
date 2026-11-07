import { supabaseServer, lerTudo } from '../../lib/supabase';
import { calcularHistorico } from '../../lib/dominio/posicoes';
import { agruparVendasPorMes, compensarPrejuizos, LIMITE_ISENCAO_CRIPTO } from '../../lib/dominio/apuracao';
import { hojeISO } from '../../lib/dominio/datas';
import { brl } from '../../lib/format';
import Copiar from './copiar-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const CRIPTO_BINANCE = ['BTC', 'PENDLE', 'SOLANA'];

// Grupo/código da ficha Bens e Direitos. ETF e BDR variam conforme o tipo do fundo:
// nesses casos a tela pede para conferir no informe da corretora.
function codigoBem(p) {
  if (p.cat === 'acao') return { grupo: '03', codigo: '01', nome: 'Ações' };
  if (p.cat === 'fii') return { grupo: '07', codigo: '03', nome: 'Fundos Imobiliários' };
  if (p.cat === 'cripto') return p.ticker === 'BTC'
    ? { grupo: '08', codigo: '01', nome: 'Bitcoin' }
    : { grupo: '08', codigo: '02', nome: 'Outras criptomoedas' };
  if (p.cat === 'etf') return { grupo: '07', codigo: '?', nome: 'ETF (código conforme o informe)', conferir: true };
  return { grupo: '04', codigo: '?', nome: 'BDR (código conforme o informe)', conferir: true };
}

const fmtQtd = (q) => Number(q).toLocaleString('pt-BR', { maximumFractionDigits: 8 });
const fmtNum = (n) => Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function discriminacao(p, ano) {
  const cripto = p.cat === 'cripto';
  const unidade = cripto ? 'unidades' : p.cat === 'acao' ? 'ações' : 'cotas';
  const onde = cripto ? 'Custodiado na exchange Binance.' : 'Custodiado na corretora Rico.';
  return `${fmtQtd(p.quantidade)} ${unidade} de ${p.ticker}, custo médio de R$ ${fmtNum(p.precoMedio)}. ${onde} Posição em 31/12/${ano}.`;
}

export default async function ImpostoRenda({ searchParams }) {
  const sb = supabaseServer();
  const [tradesRes, eventosRes, divRes, darfRes] = await Promise.all([
    lerTudo((de, ate) => sb.from('trades')
      .select('id, traded_at, side, quantity, price, assets(ticker, asset_classes(name))')
      .order('traded_at', { ascending: true }).order('id', { ascending: true }).range(de, ate)),
    sb.from('corporate_events').select('id, ticker, event_date, tipo, fator').order('event_date'),
    lerTudo((de, ate) => sb.from('dividends').select('id, ticker, paid_at, kind, amount, assets(asset_classes(name))').order('id').range(de, ate)),
    sb.from('darf_payments').select('mes_apuracao, paid_at'),
  ]);
  if (tradesRes.error) throw new Error('Não foi possível carregar as negociações.');
  const trades = tradesRes.data || [];
  const eventos = eventosRes.data || [];

  // ano-base: até maio mostra o ano anterior (época da declaração); depois, o ano corrente como prévia
  const hoje = hojeISO();
  const anoHoje = Number(hoje.slice(0, 4));
  const padrao = Number(hoje.slice(5, 7)) <= 5 ? anoHoje - 1 : anoHoje;
  const anosComDados = [...new Set(trades.map((t) => Number(String(t.traded_at || '').slice(0, 4))).filter(Boolean))];
  const anos = [...new Set([...anosComDados, padrao])].filter((a) => a <= anoHoje).sort((a, b) => b - a);
  const ano = anos.includes(Number(searchParams?.ano)) ? Number(searchParams.ano) : padrao;
  const fechado = ano < anoHoje;

  // posição em 31/12 de um ano: refaz o histórico só com o que aconteceu até lá
  const posicaoEm = (a) => {
    const fim = `${a}-12-31`;
    const { posicoes } = calcularHistorico(
      trades.filter((t) => String(t.traded_at || '').slice(0, 10) <= fim),
      eventos.filter((e) => String(e.event_date || '').slice(0, 10) <= fim),
    );
    return posicoes;
  };
  const atual = posicaoEm(ano);
  const anterior = posicaoEm(ano - 1);
  const tickers = [...new Set([...Object.keys(atual), ...Object.keys(anterior)])]
    .filter((t) => (atual[t]?.quantidade || 0) > 0 || (anterior[t]?.quantidade || 0) > 0);
  const ORDEM_CAT = { acao: 0, fii: 1, etf: 2, bdr: 3, cripto: 4 };
  const bens = tickers.map((t) => {
    const p = atual[t] || { ...anterior[t], quantidade: 0, custoTotal: 0, precoMedio: 0 };
    return { ...p, ticker: t, antes: anterior[t]?.quantidade > 0 ? anterior[t].custoTotal : 0, agora: atual[t]?.quantidade > 0 ? atual[t].custoTotal : 0, cod: codigoBem(p) };
  }).sort((a, b) => (ORDEM_CAT[a.cat] - ORDEM_CAT[b.cat]) || a.ticker.localeCompare(b.ticker));
  const totalAntes = bens.reduce((s, b) => s + b.antes, 0);
  const totalAgora = bens.reduce((s, b) => s + b.agora, 0);

  // proventos do ano por ticker
  const prov = { fii: {}, div: {}, jcp: {} };
  for (const d of divRes.data || []) {
    if (String(d.paid_at || '').slice(0, 4) !== String(ano)) continue;
    const ehFii = d.assets?.asset_classes?.name === 'FIIS';
    const tipo = d.kind === 'jcp' ? 'jcp' : ehFii ? 'fii' : 'div';
    prov[tipo][d.ticker] = (prov[tipo][d.ticker] || 0) + Number(d.amount || 0);
  }
  const listaProv = (o) => Object.entries(o).sort((a, b) => b[1] - a[1]);
  const somaProv = (o) => Object.values(o).reduce((s, v) => s + v, 0);

  // renda variável: resultado e prejuízo acumulado, com todo o histórico até o fim do ano
  const { vendas } = calcularHistorico(trades.filter((t) => String(t.traded_at || '').slice(0, 10) <= `${ano}-12-31`), eventos);
  const meses = agruparVendasPorMes(vendas);
  const { cron, acumulado } = compensarPrejuizos(meses);
  const mesesAno = cron.filter((m) => m.mes.startsWith(`${ano}-`));
  const ultimoAteAno = [...cron].reverse().find((m) => m.mes <= `${ano}-12`);
  const prejRV = ultimoAteAno ? acumulado[ultimoAteAno.mes].rv : 0;
  const prejFii = ultimoAteAno ? acumulado[ultimoAteAno.mes].fii : 0;
  const lucroIsento = mesesAno.reduce((s, m) => s + acumulado[m.mes].lucroIsentoAcao, 0);
  const pagos = new Set((darfRes.data || []).map((d) => d.mes_apuracao));
  const vendasCriptoAno = mesesAno.reduce((s, m) => s + m.vendasCripto, 0);

  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <header className="topbar">
        <div className="brand">
          <div><b>Imposto de Renda</b><span>Declaração {ano + 1} · ano-base {ano}{fechado ? '' : ' (prévia: o ano ainda não fechou)'}</span></div>
        </div>
      </header>

      <div className="ir-anos" role="group" aria-label="Ano-base">
        {anos.map((a) => (
          <a key={a} href={`/imposto-renda?ano=${a}`} className="chip" aria-pressed={a === ano}>{a}</a>
        ))}
      </div>

      <section className="card ir-aviso">
        <b>Como usar</b>
        <p>Comece pela declaração pré-preenchida da Receita: ela já traz salário, contas e saldos em banco. Daqui você copia o que ela não traz:
          o <b>custo</b> de cada ativo, os <b>proventos</b> por ativo e o <b>resultado das vendas</b> mês a mês. Confira sempre com o informe de rendimentos da Rico.</p>
      </section>

      {/* 1. Bens e Direitos */}
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <h2>Bens e Direitos</h2>
          <span className="sub">valor = custo de aquisição</span>
        </div>
        <div className="ir-bens-cab">
          <span>Ativo</span><span>31/12/{ano - 1}</span><span>31/12/{ano}</span>
        </div>
        {bens.length === 0 && <p className="ir-vazio">Nenhum ativo em carteira nesses anos.</p>}
        {bens.map((b) => (
          <div key={b.ticker} className="ir-bem">
            <div className="ir-bem-topo">
              <div className="ir-bem-ativo">
                <b>{b.ticker}</b>
                <span className={`ir-cod${b.cod.conferir ? ' conferir' : ''}`}>Grupo {b.cod.grupo} · Código {b.cod.codigo}</span>
                <span className="ir-cod-nome">{b.cod.nome}</span>
              </div>
              <div className="ir-valor">{brl(b.antes)}</div>
              <div className="ir-valor forte">{brl(b.agora)}</div>
            </div>
            {b.agora > 0 ? (
              <div className="ir-discr">
                <span>{discriminacao(b, ano)}</span>
                <Copiar texto={discriminacao(b, ano)} />
              </div>
            ) : (
              <div className="ir-discr"><span>Vendido em {ano}: informe R$ 0,00 em 31/12/{ano}.</span></div>
            )}
          </div>
        ))}
        {bens.length > 0 && (
          <div className="ir-total">
            <span>Total</span><span>{brl(totalAntes)}</span><span>{brl(totalAgora)}</span>
          </div>
        )}
        <p className="ir-nota">Reserva, CDB e contas em banco não aparecem aqui: eles já vêm na pré-preenchida pelo informe do banco.
          Para ETFs (VWRA11, B5P211, BOVA11…) o código depende do tipo do fundo — use o que estiver no informe da Rico.</p>
      </section>

      {/* 2. Rendimentos */}
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <h2>Proventos recebidos em {ano}</h2>
        </div>
        <div className="ir-prov">
          {[
            { titulo: 'Rendimentos de FII', ficha: 'Rendimentos Isentos · código 99', itens: prov.fii },
            { titulo: 'Dividendos', ficha: 'Rendimentos Isentos · código 09', itens: prov.div },
            { titulo: 'Juros sobre capital próprio', ficha: 'Tributação Exclusiva · código 10', itens: prov.jcp },
          ].map((g) => (
            <div key={g.titulo} className="ir-prov-grupo">
              <div className="ir-prov-cab">
                <div><b>{g.titulo}</b><span>{g.ficha}</span></div>
                <b className="ir-valor forte">{brl(somaProv(g.itens))}</b>
              </div>
              {listaProv(g.itens).length === 0
                ? <p className="ir-vazio">Nada recebido.</p>
                : listaProv(g.itens).map(([t, v]) => (
                  <div key={t} className="ir-linha"><span>{t}</span><span>{brl(v)}</span></div>
                ))}
            </div>
          ))}
          {lucroIsento > 0 && (
            <div className="ir-prov-grupo">
              <div className="ir-prov-cab">
                <div><b>Lucro em vendas de ações até R$ 20 mil/mês</b><span>Rendimentos Isentos · código 20</span></div>
                <b className="ir-valor forte">{brl(lucroIsento)}</b>
              </div>
            </div>
          )}
        </div>
        <p className="ir-nota">Cada provento é informado por ativo, com o CNPJ da empresa ou do fundo (está no informe da Rico). JCP entra pelo valor líquido.</p>
      </section>

      {/* 3. Renda variável */}
      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <h2>Renda Variável · vendas mês a mês</h2>
        </div>
        {mesesAno.length === 0 ? (
          <p className="ir-vazio" style={{ padding: '6px 20px 16px' }}>Nenhuma venda em {ano}. Na ficha Renda Variável basta repetir o prejuízo acumulado abaixo, se houver.</p>
        ) : (
          <>
            <div className="ir-rv-cab"><span>Mês</span><span>Operações comuns</span><span>FII</span><span>Imposto</span></div>
            {mesesAno.map((m) => {
              const a = acumulado[m.mes];
              const imposto = a.impostoRV + a.impostoFii;
              return (
                <div key={m.mes} className="ir-rv">
                  <span className="ir-rv-mes">{MESES[Number(m.mes.slice(5)) - 1]}</span>
                  <span className={a.rvMes >= 0 ? 'pos' : 'neg'}>
                    {m.vendasAcao + m.vendasBdrEtf > 0 ? brl(a.rvMes) : '—'}
                    {a.isentoAcao && m.resAcao > 0 && <small>+ {brl(m.resAcao)} isento</small>}
                  </span>
                  <span className={m.resFii >= 0 ? 'pos' : 'neg'}>{m.vendasFii > 0 ? brl(m.resFii) : '—'}</span>
                  <span>
                    {imposto > 0 ? brl(imposto) : '—'}
                    {imposto > 0 && <small>{pagos.has(m.mes) ? 'DARF pago' : 'veja na Apuração'}</small>}
                  </span>
                </div>
              );
            })}
          </>
        )}
        <div className="ir-prej">
          <span className="ir-prej-tit">Prejuízo a compensar em 31/12/{ano}</span>
          <div><span>Operações comuns</span><b>{brl(prejRV)}</b></div>
          <div><span>Fundos imobiliários</span><b>{brl(prejFii)}</b></div>
        </div>
        {vendasCriptoAno > 0 && (
          <p className="ir-nota">Cripto: {brl(vendasCriptoAno)} vendidos em {ano}. Meses com vendas até {brl(LIMITE_ISENCAO_CRIPTO)} são isentos; acima disso o ganho é apurado à parte (GCAP).</p>
        )}
        <p className="ir-nota">Na ficha Renda Variável, preencha cada mês em &ldquo;Operações comuns&rdquo; (ações tributáveis e ETFs) e em &ldquo;Fundos de investimento imobiliário&rdquo;. O detalhe de cada venda está na <a href="/apuracao">Apuração</a>.</p>
      </section>
    </div>
  );
}
