'use client';
import { useState } from 'react';
import { brl, brlShort } from '../../lib/format';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesLabel = (i) => `${MESES[i % 12]}/${Math.floor(i / 12)}`;

export default function MetaChart({ proj, realPts, target, todayIdx, realNow }) {
  const [hover, setHover] = useState(null); // { idx, relX }

  const W = 700, H = 300, padL = 6, padR = 14, padT = 16, padB = 26;
  const minIdx = Math.min(proj[0]?.idx ?? 0, realPts[0]?.idx ?? (proj[0]?.idx ?? 0));
  const targetIdx = proj[proj.length - 1]?.idx ?? todayIdx;
  const maxIdx = Math.max(todayIdx, targetIdx);
  const maxY = Math.max(target, ...realPts.map((p) => p.value), ...proj.map((p) => p.value)) * 1.05 || 1;
  const px = (idx) => padL + ((idx - minIdx) / (maxIdx - minIdx || 1)) * (W - padL - padR);
  const py = (val) => padT + (1 - val / maxY) * (H - padT - padB);

  const projByIdx = {};
  proj.forEach((p) => { projByIdx[p.idx] = p.value; });
  const realByIdx = {};
  realPts.forEach((p) => { realByIdx[p.idx] = p.value; });
  const projAt = (idx) => {
    if (idx <= proj[0].idx) return proj[0].value;
    if (projByIdx[idx] != null) return projByIdx[idx];
    return proj[proj.length - 1].value;
  };

  const projLine = proj.filter((p) => p.idx <= maxIdx).map((p) => `${px(p.idx).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ');
  const realLine = realPts.map((p) => `${px(p.idx).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ');

  const anoIni = Math.floor(minIdx / 12), anoFim = Math.floor(maxIdx / 12);
  const passoAno = Math.max(1, Math.ceil((anoFim - anoIni) / 6));
  const anos = [];
  for (let a = anoIni; a <= anoFim; a += passoAno) anos.push(a);
  const grades = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const vbX = relX * (W / rect.width);
    let idx = Math.round(minIdx + ((vbX - padL) / (W - padL - padR || 1)) * (maxIdx - minIdx));
    idx = Math.max(minIdx, Math.min(maxIdx, idx));
    setHover({ idx, relX });
  }

  const hoverReal = hover ? realByIdx[hover.idx] : null;
  const hoverProj = hover ? projAt(hover.idx) : null;

  return (
    <section className="card" style={{ padding: '16px 14px 10px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px 8px' }}>
        <span style={{ fontSize: 12, color: 'var(--forest-2)', fontWeight: 600 }}>● real</span>
        <span style={{ fontSize: 12, color: 'var(--brass)', fontWeight: 600 }}>● projeção</span>
      </div>

      <div style={{ position: 'relative' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
          {grades.map((gv, k) => (
            <g key={k}>
              <line x1={padL} y1={py(gv)} x2={W - padR} y2={py(gv)} stroke="var(--line-soft)" strokeWidth="1" />
              <text x={padL + 2} y={py(gv) - 3} fontSize="10" fill="var(--ink-faint)">{brlShort(gv)}</text>
            </g>
          ))}
          <line x1={padL} y1={py(target)} x2={W - padR} y2={py(target)} stroke="var(--brass)" strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
          <polyline points={projLine} fill="none" stroke="var(--brass)" strokeWidth="2" strokeDasharray="5 4" />
          {realLine && <polyline points={realLine} fill="none" stroke="var(--forest-2)" strokeWidth="2.5" />}
          <circle cx={px(todayIdx)} cy={py(realNow)} r="3.5" fill="var(--forest)" />

          {/* guia + pontos no hover */}
          {hover && (
            <g>
              <line x1={px(hover.idx)} y1={padT} x2={px(hover.idx)} y2={H - padB} stroke="var(--ink-faint)" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              {hoverProj != null && <circle cx={px(hover.idx)} cy={py(hoverProj)} r="4" fill="var(--brass)" stroke="var(--card)" strokeWidth="1.5" />}
              {hoverReal != null && <circle cx={px(hover.idx)} cy={py(hoverReal)} r="4.5" fill="var(--forest-2)" stroke="var(--card)" strokeWidth="1.5" />}
            </g>
          )}

          {anos.map((a) => {
            const x = px(a * 12);
            return <text key={a} x={x} y={H - 8} fontSize="10" fill="var(--ink-faint)" textAnchor="middle">{a}</text>;
          })}
        </svg>

        {/* tooltip */}
        {hover && (
          <div style={{
            position: 'absolute', top: 4, left: `${hover.relX}px`, transform: 'translateX(-50%)',
            pointerEvents: 'none', background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: 9, padding: '7px 10px', boxShadow: 'var(--shadow)', whiteSpace: 'nowrap', maxWidth: 180,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'capitalize', marginBottom: 3 }}>{mesLabel(hover.idx)}</div>
            {hoverReal != null && (
              <div style={{ fontSize: 11.5, color: 'var(--forest-2)', fontFamily: 'var(--font-display)' }}>real {brl(hoverReal)}</div>
            )}
            <div style={{ fontSize: 11.5, color: 'var(--brass)', fontFamily: 'var(--font-display)' }}>projeção {brl(hoverProj)}</div>
            {hoverReal != null && (
              <div style={{ fontSize: 10.5, marginTop: 2, color: hoverReal - hoverProj >= 0 ? 'var(--up)' : 'var(--down)' }}>
                {hoverReal - hoverProj >= 0 ? '+' : '−'}{brl(Math.abs(hoverReal - hoverProj))} vs plano
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
