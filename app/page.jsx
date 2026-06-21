import { supabaseServer } from '../lib/supabase';
import { brl, brlShort, pct } from '../lib/format';

// Sempre busca dados frescos (nada de cache pra dados financeiros).
export const dynamic = 'force-dynamic';

function mesAtualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default async function Home() {
  const sb = supabaseServer();

  // Busca tudo em paralelo
  const [alloc, divs, faturas, goal] = await Promise.all([
    sb.from('v_class_allocation').select('*'),
    sb.from('dividends').select('paid_at, amount'),
    sb.from('v_card_invoice').select('*'),
    sb.from('goal_config').select('*').single(),
  ]);

  const classes = (alloc.data || []).filter((c) => Number(c.valor) > 0);
  const total = classes.reduce((s, c) => s + Number(c.valor), 0);

  // escala das barras de alocação
  const maxPct = Math.max(0.01, ...classes.map((c) => Math.max(Number(c.pct_real), Number(c.pct_alvo || 0))));

  // dividendos: total e por ano
  const anoAtual = new Date().getFullYear();
  let divTotal = 0, divAno = 0;
  const porAno = {};
  for (const d of divs.data || []) {
    const v = Number(d.amount);
    divTotal += v;
    const ano = Number((d.paid_at || '').slice(0, 4));
    porAno[ano] = (porAno[ano] || 0) + v;
    if (ano === anoAtual) divAno += v;
  }

  // faturas do mês atual, por cartão
  const mes = mesAtualISO();
  const faturasMes = (faturas.data || [])
    .filter((f) => (f.bill_month || '').slice(0, 10) === mes)
    .sort((a, b) => a.due_day - b.due_day);

  // meta
  const alvo = Number(goal.data?.target_value || 1000000);
  const progresso = Math.min(1, total / alvo);

  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' }).replace('.', '');

  return (
    <div className="wrap">
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Patrimônio</b><span>seu hub financeiro</span></div>
        </div>
        <div className="clock">cotações ao vivo<br /><b>{hoje}</b></div>
      </header>

      {/* HERO */}
      <section className="card hero">
        <div className="hero-top">
          <div>
            <div className="eyebrow">Patrimônio total</div>
            <div className="big"><small>R$</small>{Math.round(total).toLocaleString('pt-BR')}</div>
          </div>
        </div>
        <div className="meta">
          <div className="meta-row">
            <span>Rumo à meta de <b>{brlShort(alvo)}</b></span>
            <span><b>{pct(progresso)}</b> do caminho</span>
          </div>
          <div className="track"><i style={{ width: `${progresso * 100}%` }} /></div>
        </div>
      </section>

      <div className="grid">
        {/* COCKPIT */}
        <div className="col">
          <section className="card">
            <div className="card-h"><h2>Carteira por classe · real vs. alvo</h2></div>
            <div>
              {classes.map((c) => {
                const real = Number(c.pct_real);
                const alvoPct = Number(c.pct_alvo || 0);
                const ajuste = Number(c.ajuste_rs);
                const tag = ajuste > 50 ? 'buy' : ajuste < -50 ? 'sell' : 'hold';
                const tagTxt = ajuste > 50 ? `comprar ${brlShort(ajuste)}`
                  : ajuste < -50 ? `acima ${brlShort(ajuste)}` : 'manter';
                return (
                  <div className="alloc-row" key={c.classe}>
                    <div className="a-name">{c.classe}<span>{brl(Number(c.valor))}</span></div>
                    <div className="a-bar">
                      <div className="fill" style={{ width: `${(real / maxPct) * 100}%`, background: tag === 'sell' ? 'var(--amber)' : 'var(--forest-2)' }} />
                      <div className="ideal" style={{ left: `${(alvoPct / maxPct) * 100}%` }} />
                    </div>
                    <div className="a-act">
                      <span className={`tag ${tag}`}>{tagTxt}</span>
                      <span className="pct">{pct(real)} · alvo {pct(alvoPct)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* DIVIDENDOS */}
          <section className="card">
            <div className="card-h"><h2>Dividendos</h2></div>
            <div className="div-top">
              <div><div className="eyebrow" style={{ marginBottom: 3 }}>Em {anoAtual}</div><div className="v">{brl(divAno)}</div></div>
              <div><div className="eyebrow" style={{ marginBottom: 3 }}>Acumulado</div><div className="v brass">{brl(divTotal)}</div></div>
            </div>
          </section>
        </div>

        {/* FATURAS */}
        <div className="col">
          <section className="card">
            <div className="card-h"><h2>Faturas do mês</h2></div>
            {faturasMes.length === 0 && (
              <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>Nenhuma fatura para este mês.</div>
            )}
            {faturasMes.map((f) => (
              <div className="fat" key={f.card_id}>
                <div>
                  <div className="nm">{f.cartao}</div>
                  <div className="due">vence dia {f.due_day}</div>
                </div>
                <div className="amt">{brl(Number(f.total))}</div>
              </div>
            ))}
          </section>
        </div>
      </div>

      <p className="foot">Dados reais · patrimônio e cotações ao vivo do seu Supabase.</p>
    </div>
  );
}
