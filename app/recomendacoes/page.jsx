import { supabaseServer } from '../../lib/supabase';
import { brl, brlShort, pct } from '../../lib/format';
import RecomendacoesLista from './lista-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// tolerância: aceita até X% do lado "errado" do PM antes de virar aviso
const TOL = 0.03;

export default async function Recomendacoes() {
  const sb = supabaseServer();
  const [{ data: pos }, { data: alvoAssets }, { data: alloc }, { data: classes }, { data: precos }, { data: listaAssets }, { data: listaClasses }, { data: manuais }, { data: congelados }] = await Promise.all([
    sb.from('v_positions').select('*'),
    sb.from('assets').select('ticker, target_pct, asset_classes(name, target_pct)').gt('target_pct', 0),
    sb.from('v_class_allocation').select('valor'),
    sb.from('asset_classes').select('name, target_pct'),
    sb.from('prices').select('ticker, price, updated_at'),
    sb.from('assets').select('ticker').order('ticker'),
    sb.from('asset_classes').select('id, name').order('name'),
    sb.from('manual_prices').select('ticker, price'),
    sb.from('assets').select('ticker, congelado'),
  ]);

  const FRESCO_MS = 48 * 3600 * 1000; // 2 dias
  const AGORA = Date.now();
  const precoDe = {};
  const staleDe = {};
  (precos || []).forEach((p) => {
    const idade = p.updated_at ? (AGORA - new Date(p.updated_at).getTime()) : Infinity;
    staleDe[p.ticker] = idade >= FRESCO_MS;
    if (!staleDe[p.ticker]) precoDe[p.ticker] = Number(p.price); // cotação velha é ignorada
  });
  const pmDe = {};
  (pos || []).forEach((p) => { if (Number(p.preco_medio) > 0) pmDe[p.ticker] = Number(p.preco_medio); });
  const manualDe = {};
  (manuais || []).forEach((m) => { manualDe[m.ticker] = Number(m.price); });
  const congeladoDe = {};
  (congelados || []).forEach((a) => { congeladoDe[a.ticker] = !!a.congelado; });

  // classes com pesos por ativo (têm vários ativos dentro)
  const GRUPOS = ['Ações BR', 'BDRS', 'FIIS'];
  const metaClasse = {};
  (classes || []).forEach((c) => { metaClasse[c.name] = Number(c.target_pct) || 0; });

  const total = (alloc || []).reduce((s, c) => s + Number(c.valor), 0) || 1;
  const posMap = {};
  (pos || []).forEach((p) => { if (p.preco_atual != null) posMap[p.ticker] = p; });

  const universo = new Map();
  (alvoAssets || []).forEach((a) => universo.set(a.ticker, {
    ticker: a.ticker,
    target: Number(a.target_pct) * Number(a.asset_classes?.target_pct || 0),
    classe: a.asset_classes?.name,
    congelado: congeladoDe[a.ticker] || false,
  }));
  Object.values(posMap).forEach((p) => {
    if (!universo.has(p.ticker)) {
      // classe de ativo único (ex.: BTC): o ativo é 100% da classe -> alvo = meta da classe.
      // classe com grupo (Ações/BDRs/FIIs) sem peso cadastrado -> fora da lista (alvo 0).
      const target = GRUPOS.includes(p.classe) ? 0 : (metaClasse[p.classe] || 0);
      universo.set(p.ticker, { ticker: p.ticker, target, classe: p.classe, congelado: congeladoDe[p.ticker] || false });
    }
  });

  const itens = [];
  for (const u of universo.values()) {
    const p = posMap[u.ticker];
    const held = !!p;
    const pesoReal = held ? Number(p.valor_carteira) / total : 0;
    const gap = u.target - pesoReal; // >0 = abaixo do alvo
    const sugestaoRs = gap * total;
    const d = held && Number(p.preco_medio) > 0
      ? (Number(p.preco_atual) - Number(p.preco_medio)) / Number(p.preco_medio)
      : null;
    const dPct = d != null ? Math.round(Math.abs(d) * 100) : null;

    let acao = 'manter', tom = 'hold', motivo = 'no alvo', forca = 0, nova = false, atencao = false;

    if (u.congelado) {
      motivo = 'congelado — fora do rebalanceamento';
    } else if (!held && u.target > 0) {
      acao = 'comprar'; tom = 'buy'; motivo = 'nova posição — você ainda não tem'; forca = 5; nova = true;
    } else if (held) {
      const abaixoAlvo = gap > 0.002;
      const acimaAlvo = gap < -0.005;

      if (abaixoAlvo) {
        acao = 'comprar'; tom = 'buy';
        const precoOk = d != null && d <= TOL; // no PM ou até 3% acima
        if (precoOk) {
          if (d < -0.005) { motivo = `abaixo do alvo · ${dPct}% abaixo do PM`; forca = 4; }
          else { motivo = 'abaixo do alvo · preço perto do PM'; forca = 3; }
        } else {
          atencao = true; forca = 1;
          motivo = d != null ? `abaixo do alvo, mas ${dPct}% acima do PM` : 'abaixo do alvo · sem cotação';
        }
      } else if (acimaAlvo) {
        acao = 'reduzir'; tom = 'sell';
        const precoOk = d != null && d >= -TOL; // no PM ou até 3% abaixo (não vende no prejuízo)
        if (precoOk) {
          if (d > 0.005) { motivo = `acima do alvo · ${dPct}% acima do PM`; forca = 4; }
          else { motivo = 'acima do alvo · preço perto do PM'; forca = 3; }
        } else {
          atencao = true; forca = 1;
          motivo = d != null ? `acima do alvo, mas ${dPct}% abaixo do PM` : 'acima do alvo · sem cotação';
        }
      }
    }

    // preço unitário: cotação atual, senão do mapa de preços, senão PM (de qualquer posição)
    const precoAtualFresco = (held && p.preco_atual != null && !staleDe[u.ticker]) ? Number(p.preco_atual) : null;
    const precoUnit = precoAtualFresco
      ?? (precoDe[u.ticker] > 0 ? precoDe[u.ticker] : null)
      ?? (manualDe[u.ticker] > 0 ? manualDe[u.ticker] : null)
      ?? (pmDe[u.ticker] > 0 ? pmDe[u.ticker] : null);
    const semCotacaoAuto = precoAtualFresco == null && !(precoDe[u.ticker] > 0);
    const precoManual = manualDe[u.ticker] ?? null;
    const inteiro = GRUPOS.includes(u.classe); // ações/BDRs/FIIs = cotas inteiras
    const rs = Math.abs(sugestaoRs);
    let qtd = null, umaCotaPassa = false;
    if (precoUnit > 0 && (acao === 'comprar' || acao === 'reduzir')) {
      if (inteiro) {
        qtd = Math.floor(rs / precoUnit);
        umaCotaPassa = qtd < 1 && precoUnit > rs;
      } else {
        qtd = rs / precoUnit; // cripto: fracionário
      }
    }

    itens.push({ ...u, held, pesoReal, gap, sugestaoRs, desconto: d, acao, tom, motivo, forca, nova, atencao, p, precoUnit, qtd, inteiro, umaCotaPassa, semCotacaoAuto, precoManual });
  }

  // novas primeiro, depois clean vs atenção; dentro de cada grupo, MAIOR valor no topo
  // se nem 1 cota cabe no ajuste, não conta como compra
  const comprar = itens.filter((i) => i.acao === 'comprar' && !i.umaCotaPassa)
    .sort((a, b) => (b.nova - a.nova) || (a.atencao - b.atencao) || (Math.abs(b.sugestaoRs) - Math.abs(a.sugestaoRs)));
  const reduzir = itens.filter((i) => i.acao === 'reduzir')
    .sort((a, b) => (a.atencao - b.atencao) || (Math.abs(b.sugestaoRs) - Math.abs(a.sugestaoRs)));
  const manter = itens.filter((i) => i.acao === 'manter');
  const novasN = comprar.filter((i) => i.nova).length;

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Recomendações</b><span>o que comprar e reduzir</span></div>
        </div>
        <a href="/carteira" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>carteira →</a>
      </header>

      <RecomendacoesLista
        comprar={comprar}
        reduzir={reduzir}
        manterN={manter.length}
        novasN={novasN}
        tol={TOL}
        assets={listaAssets || []}
        classes={listaClasses || []}
      />
    </div>
  );
}
