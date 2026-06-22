import { supabaseServer } from '../../lib/supabase';
import { brl, brlShort, pct } from '../../lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Recomendacoes() {
  const sb = supabaseServer();
  const [{ data: pos }, { data: alvoAssets }, { data: alloc }] = await Promise.all([
    sb.from('v_positions').select('*'),
    sb.from('assets').select('ticker, target_pct, asset_classes(name)').gt('target_pct', 0),
    sb.from('v_class_allocation').select('valor'),
  ]);

  const total = (alloc || []).reduce((s, c) => s + Number(c.valor), 0) || 1;
  const posMap = {};
  (pos || []).forEach((p) => { if (p.preco_atual != null) posMap[p.ticker] = p; });

  // universo: ativos com alvo + ativos que possuo
  const universo = new Map();
  (alvoAssets || []).forEach((a) => universo.set(a.ticker, { ticker: a.ticker, target: Number(a.target_pct), classe: a.asset_classes?.name }));
  Object.values(posMap).forEach((p) => {
    if (!universo.has(p.ticker)) universo.set(p.ticker, { ticker: p.ticker, target: 0, classe: p.classe });
  });

  const itens = [];
  for (const u of universo.values()) {
    const p = posMap[u.ticker];
    const held = !!p;
    const pesoReal = held ? Number(p.valor_carteira) / total : 0;
    const gap = u.target - pesoReal; // >0 = abaixo do alvo
    const sugestaoRs = gap * total;
    const desconto = held && Number(p.preco_medio) > 0
      ? (Number(p.preco_atual) - Number(p.preco_medio)) / Number(p.preco_medio)
      : null;

    let acao = 'manter', tom = 'hold', motivo = 'no alvo', forca = 0;
    if (!held && u.target > 0) {
      acao = 'comprar'; tom = 'buy'; motivo = 'nova posição — você ainda não tem'; forca = 3;
    } else if (held) {
      const abaixoPM = desconto != null && desconto < -0.005;
      const abaixoAlvo = gap > 0.002;
      const acimaAlvo = gap < -0.005;
      if (abaixoAlvo && abaixoPM) { acao = 'comprar'; tom = 'buy'; motivo = `abaixo do alvo e ${(desconto * 100).toFixed(0)}% abaixo do PM`; forca = 4; }
      else if (abaixoAlvo) { acao = 'comprar'; tom = 'buy'; motivo = 'abaixo do alvo de alocação'; forca = 2; }
      else if (abaixoPM) { acao = 'comprar'; tom = 'buy'; motivo = `${(desconto * 100).toFixed(0)}% abaixo do PM`; forca = 2; }
      else if (acimaAlvo) { acao = 'reduzir'; tom = 'sell'; motivo = Number(p.lucro_rs) >= 0 ? 'acima do alvo — no lucro' : 'acima do alvo'; forca = 2; }
    }

    itens.push({ ...u, held, pesoReal, gap, sugestaoRs, desconto, acao, tom, motivo, forca, p });
  }

  const comprar = itens.filter((i) => i.acao === 'comprar').sort((a, b) => b.forca - a.forca || b.sugestaoRs - a.sugestaoRs);
  const reduzir = itens.filter((i) => i.acao === 'reduzir').sort((a, b) => a.sugestaoRs - b.sugestaoRs);
  const manter = itens.filter((i) => i.acao === 'manter');

  const Linha = ({ i }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid var(--line-soft)' }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
        background: i.tom === 'buy' ? 'var(--up-bg)' : i.tom === 'sell' ? 'var(--down-bg)' : '#EFF1EC',
        color: i.tom === 'buy' ? 'var(--up)' : i.tom === 'sell' ? 'var(--down)' : 'var(--ink-faint)',
      }}>{i.tom === 'buy' ? 'C' : i.tom === 'sell' ? 'V' : '–'}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{i.ticker}</b>
          <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{i.classe}</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{i.motivo}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: i.tom === 'buy' ? 'var(--up)' : 'var(--down)' }}>
          {i.sugestaoRs >= 0 ? 'comprar ' : 'reduzir '}{brlShort(Math.abs(i.sugestaoRs))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
          {pct(i.pesoReal)} de {pct(i.target)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Recomendações</b><span>o que comprar e reduzir</span></div>
        </div>
        <a href="/carteira" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>carteira →</a>
      </header>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><h2>Comprar ({comprar.length})</h2></div>
        <div style={{ marginTop: 6 }}>
          {comprar.map((i) => <Linha key={i.ticker} i={i} />)}
          {comprar.length === 0 && <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>Nada abaixo do alvo ou do PM agora.</div>}
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><h2>Reduzir ({reduzir.length})</h2></div>
        <div style={{ marginTop: 6 }}>
          {reduzir.map((i) => <Linha key={i.ticker} i={i} />)}
          {reduzir.length === 0 && <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>Nenhum ativo acima do alvo.</div>}
        </div>
      </section>

      <p style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', margin: '4px 0 18px' }}>
        {manter.length} ativos no alvo. Sugestões baseadas em preço médio + alvo de alocação — ajustáveis.
      </p>
    </div>
  );
}
