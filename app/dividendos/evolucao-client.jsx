'use client';
import { useState } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtK = (n) => {
  const v = Number(n) || 0;
  if (v >= 1000) return 'R$ ' + (v / 1000).toFixed(v >= 10000 ? 0 : 1).replace('.', ',') + 'k';
  return 'R$ ' + Math.round(v);
};
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotMes = (ym) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]}/${a.slice(2)}`; };

export default function EvolucaoProventos({ porMes, porAno }) {
  const [modo, setModo] = useState('mes'); // 'mes' | 'ano'
  const [hover, setHover] = useState(null);

  const dados = modo === 'mes' ? porMes : porAno;
  if (!dados.length) {
    return (
      <section className="card" style={{ marginTop: 16, padding: 18, fontSize: 13, color: 'var(--ink-faint)' }}>
        Ainda não há proventos recebidos pra montar a evolução.
      </section>
    );
  }

  const max = Math.max(...dados.map((d) => d.total), 1);
  const media = dados.reduce((s, d) => s + d.total, 0) / dados.length;

  const btn = (val, label) => (
    <button onClick={() => { setModo(val); setHover(null); }} style={{
      padding: '6px 11px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
      background: modo === val ? 'var(--forest)' : 'var(--surface)', color: modo === val ? '#fff' : 'var(--ink-soft)',
    }}>{label}</button>
  );

  // dimensões SVG
  const W = 700, H = 240, padL = 8, padR = 8, padT = 14, padB = 34;
  const n = dados.length;
  const bw = (W - padL - padR) / n;
  const barW = Math.min(bw * 0.62, 40);
  const py = (v) => padT + (1 - v / max) * (H - padT - padB);
  const cx = (i) => padL + bw * i + bw / 2;

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2>Evolução dos proventos</h2>
        <div style={{ display: 'flex', gap: 6 }}>{btn('mes', 'Por mês')}{btn('ano', 'Por ano')}</div>
      </div>

      <div style={{ padding: '4px 20px 0', fontSize: 12, color: 'var(--ink-faint)' }}>
        média {modo === 'mes' ? 'mensal' : 'anual'}: <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>{fmt(media)}</b>
      </div>

      <div style={{ position: 'relative', padding: '8px 6px 4px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}
          onMouseLeave={() => setHover(null)}>
          {/* linha da média */}
          <line x1={padL} y1={py(media)} x2={W - padR} y2={py(media)} stroke="var(--brass)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
          {dados.map((d, i) => {
            const ativo = hover === i;
            const h = (H - padT - padB) - (py(d.total) - padT);
            return (
              <g key={d.key} onMouseEnter={() => setHover(i)}>
                <rect x={cx(i) - bw / 2} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
                <rect x={cx(i) - barW / 2} y={py(d.total)} width={barW} height={Math.max(h, 1)} rx="3"
                  fill={ativo ? 'var(--forest)' : 'var(--forest-2)'} />
                {(modo === 'ano' || n <= 14 || i % Math.ceil(n / 14) === 0) && (
                  <text x={cx(i)} y={H - 12} fontSize="10" fill="var(--ink-faint)" textAnchor="middle">
                    {modo === 'mes' ? rotMes(d.key) : d.key}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hover != null && (
          <div style={{
            position: 'absolute', top: 6, left: `${(cx(hover) / W) * 100}%`, transform: 'translateX(-50%)',
            pointerEvents: 'none', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 9,
            padding: '6px 10px', boxShadow: 'var(--shadow)', whiteSpace: 'nowrap',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{modo === 'mes' ? rotMes(dados[hover].key) : dados[hover].key}</div>
            <div style={{ fontSize: 12, color: 'var(--up)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{fmt(dados[hover].total)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
