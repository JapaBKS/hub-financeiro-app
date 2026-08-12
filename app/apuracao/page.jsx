import { supabaseServer } from '../../lib/supabase';
import ApuracaoLista from './lista-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Categoria tributária:
//  acao -> ação à vista (isenção de R$20 mil/mês em vendas)
//  bdr  -> BDR (sem isenção)         | etf -> ETF de ações (sem isenção)
//  fii  -> fundo imobiliário (20%, apura separado, sem isenção)
function categoria(ticker, classe) {
  const t = (ticker || '').toUpperCase();
  if ((classe || '').toUpperCase() === 'FIIS') return 'fii';
  if (/^[A-Z0-9]{4}3[2-9]$/.test(t)) return 'bdr';
  if (/11$/.test(t)) return 'etf';
  return 'acao';
}

export default async function Apuracao() {
  const sb = supabaseServer();
  const [{ data: trades }, { data: darfsPagas }, { data: eventos }] = await Promise.all([
    sb.from('trades')
      .select('traded_at, side, quantity, price, assets(ticker, asset_classes(name))')
      .order('traded_at', { ascending: true })
      .order('id', { ascending: true }),
    sb.from('darf_payments').select('mes_apuracao, paid_at'),
    sb.from('corporate_events').select('id, ticker, event_date, tipo, fator, nota').order('event_date'),
  ]);
  const pagos = {};
  (darfsPagas || []).forEach((d) => { pagos[d.mes_apuracao] = d.paid_at; });

  // custo médio móvel por ticker
  const pos = {}; // ticker -> { qtd, custo }
  const meses = {}; // 'YYYY-MM' -> agregados

  const garanteMes = (m) => {
    if (!meses[m]) {
      meses[m] = {
        mes: m,
        vendasAcao: 0, vendasBdrEtf: 0, vendasFii: 0,
        resAcao: 0, resBdrEtf: 0, resFii: 0,
        vendas: [],
      };
    }
    return meses[m];
  };

  // Junta negociações e eventos societários numa linha do tempo só.
  // Desdobramento/grupamento muda a QUANTIDADE sem mexer no custo total —
  // sem isso, o preço médio fica errado e o resultado da venda sai distorcido.
  const linha = [
    ...(trades || []).map((t) => ({
      kind: 'trade',
      dia: (t.traded_at || '').slice(0, 10),
      ticker: t.assets?.ticker,
      classe: t.assets?.asset_classes?.name,
      side: t.side,
      q: Number(t.quantity) || 0,
      p: Number(t.price) || 0,
      traded_at: t.traded_at,
    })),
    ...(eventos || []).map((e) => ({
      kind: 'evento',
      dia: (e.event_date || '').slice(0, 10),
      ticker: (e.ticker || '').toUpperCase(),
      fator: Number(e.fator) || 1,
      tipo: e.tipo,
    })),
  ].sort((a, b) => a.dia.localeCompare(b.dia) || (a.kind === 'evento' ? -1 : 1));

  const negativos = new Set();

  linha.forEach((t) => {
    const ticker = t.ticker;
    if (!ticker) return;
    if (!pos[ticker]) pos[ticker] = { qtd: 0, custo: 0 };
    const P = pos[ticker];

    if (t.kind === 'evento') {
      // muda a quantidade, mantém o custo total (PM se ajusta sozinho)
      P.qtd = P.qtd * t.fator;
      return;
    }

    const classe = t.classe;
    const q = t.q;
    const p = t.p;
    if (!q || !p) return;

    if (t.side === 'compra') {
      P.qtd += q;
      P.custo += q * p;
      return;
    }

    // venda: resultado = (preço − custo médio) × quantidade
    const pm = P.qtd > 0 ? P.custo / P.qtd : 0;
    const resultado = (p - pm) * q;
    const custoBaixado = pm * q;
    P.qtd -= q;
    P.custo -= custoBaixado;
    if (P.qtd < -0.0001) negativos.add(ticker); // provável evento societário faltando
    if (P.qtd <= 0.0000001) { P.qtd = 0; P.custo = 0; }

    const m = (t.traded_at || '').slice(0, 7);
    if (!m) return;
    const M = garanteMes(m);
    const cat = categoria(ticker, classe);
    const bruto = q * p;

    if (cat === 'fii') { M.vendasFii += bruto; M.resFii += resultado; }
    else if (cat === 'acao') { M.vendasAcao += bruto; M.resAcao += resultado; }
    else { M.vendasBdrEtf += bruto; M.resBdrEtf += resultado; }

    M.vendas.push({
      dia: (t.traded_at || '').slice(0, 10),
      ticker, cat, qtd: q, preco: p, pm, bruto, resultado,
    });
  });

  const lista = Object.values(meses)
    .map((m) => ({ ...m, vendas: m.vendas.sort((a, b) => a.dia.localeCompare(b.dia)) }))
    .sort((a, b) => b.mes.localeCompare(a.mes));

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Apuração</b><span>resultado por mês · conferência</span></div>
        </div>
        <a href="/biblioteca" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>biblioteca →</a>
      </header>
      <ApuracaoLista meses={lista} pagos={pagos} eventos={eventos || []} suspeitos={[...negativos].sort()} />
    </div>
  );
}
