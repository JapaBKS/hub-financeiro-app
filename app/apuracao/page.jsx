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
  const { data: trades } = await sb
    .from('trades')
    .select('traded_at, side, quantity, price, assets(ticker, asset_classes(name))')
    .order('traded_at', { ascending: true })
    .order('id', { ascending: true });

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

  (trades || []).forEach((t) => {
    const ticker = t.assets?.ticker;
    if (!ticker) return;
    const classe = t.assets?.asset_classes?.name;
    const q = Number(t.quantity) || 0;
    const p = Number(t.price) || 0;
    if (!q || !p) return;

    if (!pos[ticker]) pos[ticker] = { qtd: 0, custo: 0 };
    const P = pos[ticker];

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
      <ApuracaoLista meses={lista} />
    </div>
  );
}
