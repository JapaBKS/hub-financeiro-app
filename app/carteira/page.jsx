import { supabaseServer } from '../../lib/supabase';
import { brl, pct } from '../../lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const fmtNum = (n, d = 2) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });

export default async function Carteira() {
  const sb = supabaseServer();
  const { data: pos } = await sb.from('v_positions').select('*');

  // inclui todos; quem não tem cotação usa o PM como valor provisório
  const ativos = (pos || []).map((p) => {
    const semCotacao = p.preco_atual == null;
    const precoRef = semCotacao ? Number(p.preco_medio) : Number(p.preco_atual);
    const valor = Number(p.quantidade) * precoRef;
    const lucro = semCotacao ? 0 : Number(p.lucro_rs);
    return { ...p, semCotacao, precoRef, valor, lucro };
  });

  const totalCarteira = ativos.reduce((s, p) => s + p.valor, 0);
  const totalLucro = ativos.reduce((s, p) => s + p.lucro, 0);
  const totalInvestido = totalCarteira - totalLucro;
  const rentTotal = totalInvestido > 0 ? totalLucro / totalInvestido : 0;
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
            {p.semCotacao && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--amber)', background: 'var(--amber-bg)', borderRadius: 5, padding: '1px 6px' }}>aguardando cotação</span>
            )}
            {!p.semCotacao && p.mais_barato && (
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--up)', background: 'var(--up-bg)', borderRadius: 5, padding: '1px 6px' }}>abaixo do PM</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2, fontFamily: 'var(--font-display)' }}>
            {fmtNum(p.quantidade, Number.isInteger(Number(p.quantidade)) ? 0 : 2)} · PM {fmtNum(p.preco_medio)}
            {p.semCotacao ? '' : ` · agora ${fmtNum(p.preco_atual)}`}
          </div>
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
        </div>
      </div>
    );
  };

  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Carteira</b><span>{ativos.length} ativos{aguardando > 0 ? ` · ${aguardando} s/ cotação` : ''}</span></div>
        </div>
        <a href="/registrar" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>+ negociação</a>
      </header>

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
    </div>
  );
}
