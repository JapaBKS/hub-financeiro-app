import { supabaseServer } from '../../lib/supabase';
import { brl, pct } from '../../lib/format';

export const dynamic = 'force-dynamic';

const fmtNum = (n, d = 2) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

export default async function Carteira() {
  const sb = supabaseServer();
  const { data: pos } = await sb.from('v_positions').select('*');

  const ativos = (pos || []).filter((p) => p.preco_atual != null);
  const totalCarteira = ativos.reduce((s, p) => s + Number(p.valor_carteira), 0);
  const totalLucro = ativos.reduce((s, p) => s + Number(p.lucro_rs), 0);
  const totalInvestido = totalCarteira - totalLucro;
  const rentTotal = totalInvestido > 0 ? totalLucro / totalInvestido : 0;

  // agrupa por classe
  const grupos = {};
  for (const p of ativos) {
    (grupos[p.classe] ||= []).push(p);
  }
  const classesOrdenadas = Object.entries(grupos)
    .map(([classe, lista]) => ({
      classe,
      lista: lista.sort((a, b) => a.ticker.localeCompare(b.ticker)),
      total: lista.reduce((s, p) => s + Number(p.valor_carteira), 0),
    }))
    .sort((a, b) => b.total - a.total);

  const corLucro = (v) => (v >= 0 ? 'var(--up)' : 'var(--down)');

  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Carteira</b><span>{ativos.length} ativos</span></div>
        </div>
        <a href="/registrar" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>+ negociação</a>
      </header>

      {/* resumo */}
      <section className="card" style={{ padding: '20px 22px', marginBottom: 16, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 3 }}>Valor da carteira</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 26, letterSpacing: '-.02em' }}>{brl(totalCarteira)}</div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 3 }}>Investido</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>{brl(totalInvestido)}</div>
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 3 }}>Lucro</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20, color: corLucro(totalLucro) }}>
            {totalLucro >= 0 ? '+' : ''}{brl(totalLucro)} · {pct(rentTotal)}
          </div>
        </div>
      </section>

      {/* por classe */}
      {classesOrdenadas.map(({ classe, lista, total }) => (
        <section className="card" key={classe} style={{ marginBottom: 16 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            padding: '15px 20px', borderBottom: '1px solid var(--line-soft)',
          }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>{classe}</h2>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)', fontSize: 14 }}>{brl(total)}</b>
              {' · '}{pct(totalCarteira > 0 ? total / totalCarteira : 0)} da carteira
            </div>
          </div>

          {lista.map((p) => {
            const investido = Number(p.valor_carteira) - Number(p.lucro_rs);
            const rent = investido > 0 ? Number(p.lucro_rs) / investido : 0;
            return (
              <div key={p.ticker} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
                borderBottom: '1px solid var(--line-soft)',
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{p.ticker}</b>
                    {p.mais_barato && (
                      <span style={{
                        fontSize: 10, fontWeight: 600, color: 'var(--up)', background: 'var(--up-bg)',
                        borderRadius: 5, padding: '1px 6px',
                      }}>abaixo do PM</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2, fontFamily: 'var(--font-display)' }}>
                    {fmtNum(p.quantidade, Number.isInteger(Number(p.quantidade)) ? 0 : 2)} · PM {fmtNum(p.preco_medio)} · agora {fmtNum(p.preco_atual)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14, fontVariantNumeric: 'tabular-nums' }}>
                    {brl(Number(p.valor_carteira))}
                  </div>
                  <div style={{ fontSize: 11.5, fontFamily: 'var(--font-display)', fontWeight: 600, color: corLucro(Number(p.lucro_rs)), marginTop: 2 }}>
                    {Number(p.lucro_rs) >= 0 ? '+' : ''}{pct(rent)}
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      ))}

      {ativos.length === 0 && (
        <div className="card" style={{ padding: 20, fontSize: 13, color: 'var(--ink-faint)' }}>
          Nenhuma posição com cotação no momento.
        </div>
      )}
    </div>
  );
}
