import { supabaseServer } from '../../lib/supabase';
import { brl, brlShort, pct } from '../../lib/format';
import MetaForm from './meta-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ymIndex = (s) => { const [y, m] = s.slice(0, 7).split('-').map(Number); return y * 12 + (m - 1); };
const idxLabel = (i) => `${String((i % 12) + 1).padStart(2, '0')}/${Math.floor(i / 12)}`;
const idxYear = (i) => Math.floor(i / 12);

export default async function Meta() {
  const sb = supabaseServer();
  const [{ data: goal }, { data: snaps }, { data: alloc }] = await Promise.all([
    sb.from('goal_config').select('*').eq('id', 1).maybeSingle(),
    sb.from('portfolio_snapshots').select('snapshot_month, value'),
    sb.from('v_class_allocation').select('valor'),
  ]);

  const realNow = (alloc || []).reduce((s, c) => s + Number(c.valor), 0);

  if (!goal) {
    return (
      <div className="wrap" style={{ maxWidth: 640 }}>
        <header className="topbar">
          <div className="brand"><div className="mark" /><div><b>Meta</b><span>projeção do patrimônio</span></div></div>
          <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
        </header>
        <div className="card" style={{ padding: 20, marginBottom: 16, fontSize: 13, color: 'var(--ink-soft)' }}>
          Defina sua meta para ver a projeção. Patrimônio atual: <b>{brl(realNow)}</b>.
        </div>
        <MetaForm goal={{ target_value: realNow * 2, monthly_contribution: 1000, assumed_annual_return: 0.1, started_at: new Date().toISOString().slice(0, 10), starting_value: realNow }} />
      </div>
    );
  }

  const target = Number(goal.target_value);
  const monthly = Number(goal.monthly_contribution);
  const annual = Number(goal.assumed_annual_return);
  const r = Math.pow(1 + annual, 1 / 12) - 1;
  const startIdx = ymIndex(goal.started_at);
  const startVal = Number(goal.starting_value);

  const hoje = new Date();
  const todayIdx = hoje.getUTCFullYear() * 12 + hoje.getUTCMonth();

  // projeção (plano) a partir do início
  const proj = [{ idx: startIdx, value: startVal }];
  let v = startVal, i = startIdx, g = 0;
  while (v < target && g < 720) { v = v * (1 + r) + monthly; i++; g++; proj.push({ idx: i, value: v }); }
  const targetIdx = i;
  const projAt = (idx) => {
    if (idx <= proj[0].idx) return proj[0].value;
    const p = proj.find((p) => p.idx === idx);
    return p ? p.value : proj[proj.length - 1].value;
  };
  const plannedNow = projAt(todayIdx);

  // real (snapshots somados por mês) + ponto de hoje ao vivo
  const realMap = {};
  (snaps || []).forEach((s) => { const k = ymIndex(s.snapshot_month); realMap[k] = (realMap[k] || 0) + Number(s.value); });
  realMap[todayIdx] = realNow;
  const realPts = Object.entries(realMap).map(([k, val]) => ({ idx: Number(k), value: val })).sort((a, b) => a.idx - b.idx);

  // previsão realista a partir do valor de hoje
  let vr = realNow, j = todayIdx, g2 = 0;
  while (vr < target && g2 < 720) { vr = vr * (1 + r) + monthly; j++; g2++; }
  const forecastIdx = j;
  const mesesFalta = Math.max(0, forecastIdx - todayIdx);

  const falta = Math.max(0, target - realNow);
  const progresso = target > 0 ? realNow / target : 0;
  const ritmoDiff = realNow - plannedNow;
  const ritmoPct = plannedNow > 0 ? realNow / plannedNow - 1 : 0;
  const adiante = ritmoDiff >= 0;

  // ---- gráfico SVG ----
  const W = 700, H = 300, padL = 6, padR = 14, padT = 16, padB = 26;
  const minIdx = Math.min(startIdx, realPts[0]?.idx ?? startIdx);
  const maxIdx = Math.max(todayIdx, targetIdx);
  const maxY = Math.max(target, ...realPts.map((p) => p.value), ...proj.map((p) => p.value)) * 1.05;
  const px = (idx) => padL + ((idx - minIdx) / (maxIdx - minIdx || 1)) * (W - padL - padR);
  const py = (val) => padT + (1 - val / maxY) * (H - padT - padB);

  const projLine = proj.filter((p) => p.idx <= maxIdx).map((p) => `${px(p.idx).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ');
  const realLine = realPts.map((p) => `${px(p.idx).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ');

  // marcas de ano no eixo X
  const anoIni = idxYear(minIdx), anoFim = idxYear(maxIdx);
  const passoAno = Math.max(1, Math.ceil((anoFim - anoIni) / 6));
  const anos = [];
  for (let a = anoIni; a <= anoFim; a += passoAno) anos.push(a);
  // grades horizontais
  const grades = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="topbar">
        <div className="brand"><div className="mark" /><div><b>Meta</b><span>projeção do patrimônio</span></div></div>
        <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
      </header>

      {/* números de destaque */}
      <section className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Patrimônio</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 26, letterSpacing: '-.02em' }}>{brl(realNow)}</div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Meta</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>{brl(target)}</div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Falta</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>{brl(falta)}</div>
          </div>
        </div>

        {/* barra de progresso */}
        <div style={{ marginTop: 16, height: 8, background: '#E8ECE4', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, progresso * 100)}%`, height: '100%', background: 'var(--forest)' }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>{pct(progresso)} da meta</div>

        {/* no ritmo? */}
        <div style={{
          marginTop: 16, padding: '12px 14px', borderRadius: 10,
          background: adiante ? 'var(--up-bg)' : 'var(--amber-bg)',
          border: `1px solid ${adiante ? 'var(--up)' : 'var(--amber)'}22`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: adiante ? 'var(--up)' : 'var(--amber)' }}>
            {adiante ? '✓ No ritmo — à frente do plano' : '⚠ Abaixo do ritmo do plano'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3 }}>
            Plano previa {brl(plannedNow)} para hoje · você tem {brl(realNow)} ({adiante ? '+' : ''}{brl(ritmoDiff)}, {adiante ? '+' : ''}{pct(ritmoPct)})
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
            No ritmo atual, meta em <b>{idxLabel(forecastIdx)}</b> (~{Math.floor(mesesFalta / 12)}a {mesesFalta % 12}m)
          </div>
        </div>
      </section>

      {/* gráfico */}
      <section className="card" style={{ padding: '16px 14px 10px', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px 8px' }}>
          <span style={{ fontSize: 12, color: 'var(--forest-2)', fontWeight: 600 }}>● real</span>
          <span style={{ fontSize: 12, color: 'var(--brass)', fontWeight: 600 }}>● projeção</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {grades.map((gv, k) => (
            <g key={k}>
              <line x1={padL} y1={py(gv)} x2={W - padR} y2={py(gv)} stroke="var(--line-soft)" strokeWidth="1" />
              <text x={padL + 2} y={py(gv) - 3} fontSize="10" fill="var(--ink-faint)">{brlShort(gv)}</text>
            </g>
          ))}
          {/* linha da meta */}
          <line x1={padL} y1={py(target)} x2={W - padR} y2={py(target)} stroke="var(--brass)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
          {/* projeção */}
          <polyline points={projLine} fill="none" stroke="var(--brass)" strokeWidth="2" strokeDasharray="5 4" />
          {/* real */}
          {realLine && <polyline points={realLine} fill="none" stroke="var(--forest-2)" strokeWidth="2.5" />}
          {/* ponto de hoje */}
          <circle cx={px(todayIdx)} cy={py(realNow)} r="3.5" fill="var(--forest)" />
          {/* eixo X anos */}
          {anos.map((a) => {
            const x = px(a * 12);
            return <text key={a} x={x} y={H - 8} fontSize="10" fill="var(--ink-faint)" textAnchor="middle">{a}</text>;
          })}
        </svg>
      </section>

      <MetaForm goal={goal} />
    </div>
  );
}
