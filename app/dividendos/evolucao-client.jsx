'use client';
import { useState } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotMes = (ym) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]}/${a.slice(2)}`; };

export default function EvolucaoProventos({ porMes, porAno }) {
  const [modo, setModo] = useState('mes');
  const [hover, setHover] = useState(null);

  const dados = modo === 'mes' ? porMes : porAno;
  if (!dados.length) {
    return (
      <section className="card" style={{ marginTop: 16, padding: 18, fontSize: 13, color: 'var(--ink-faint)' }}>
        Ainda não há proventos pra montar a evolução.
      </section>
    );
  }

  const max = Math.max(...dados.map((d) => d.total + (d.pendente || 0)), 1);
  const recebidos = dados.filter((d) => d.total > 0);
  const media = recebidos.length ? recebidos.reduce((s, d) => s + d.total, 0) / recebidos.length : 0;
  const temPendente = dados.some((d) => (d.pendente || 0) > 0);

  const btn = (val, label) => (
    <button onClick={() => { setModo(val); setHover(null); }} style={{
      padding: '6px 11px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
      background: modo === val ? 'var(--forest)' : 'var(--surface)', color: modo === val ? '#fff' : 'var(--ink-soft)',
    }}>{label}</button>
  );

  const W = 700, H = 240, padL = 8, padR = 8, padT = 14, padB = 34;
  const n = dados.length;
  const bw = (W - padL - padR) / n;
  const barW = Math.min(bw * 0.62, 40);
  const chartH = H - padT - padB;
  const baseline = H - padB;
  const hOf = (v) => (v / max) * chartH;
  const cx = (i) => padL + bw * i + bw / 2;

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2>Evolução dos proventos</h2>
        <div style={{ display: 'flex', gap: 6 }}>{btn('mes', 'Por mês')}{btn('ano', 'Por ano')}</div>
      </div>

      <div style={{ padding: '4px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
          média {modo === 'mes' ? 'mensal' : 'anual'} recebida: <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>{fmt(media)}</b>
        </span>
        {temPendente && (
          <span style={{ display: 'flex', gap: 12, fontSize: 11 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-soft)' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--forest-2)' }} />recebido</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--ink-soft)' }}><span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--forest-2)', opacity: 0.32 }} />a receber</span>
          </span>
        )}
      </div>

      <div style={{ position: 'relative', padding: '8px 6px 4px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseLeave={() => setHover(null)}>
          {media > 0 && (
            <line x1={padL} y1={baseline - hOf(media)} x2={W - padR} y2={baseline - hOf(media)} stroke="var(--brass)" strokeWidth="1" strokeDasharray="4 4" opacity="0.6" />
          )}
          {dados.map((d, i) => {
            const ativo = hover === i;
            const hR = hOf(d.total);
            const hP = hOf(d.pendente || 0);
            return (
              <g key={d.key} onMouseEnter={() => setHover(i)}>
                <rect x={cx(i) - bw / 2} y={padT} width={bw} height={chartH} fill="transparent" />
                {d.total > 0 && (
                  <rect x={cx(i) - barW / 2} y={baseline - hR} width={barW} height={Math.max(hR, 1)} rx="3"
                    className="bar-grow" style={{ animationDelay: `${0.1 + i * 0.03}s` }}
                    fill={ativo ? 'var(--forest)' : 'var(--forest-2)'} />
                )}
                {(d.pendente || 0) > 0 && (
                  <rect x={cx(i) - barW / 2} y={baseline - hR - hP} width={barW} height={Math.max(hP, 1)} rx="3"
                    className="bar-grow" style={{ animationDelay: `${0.1 + i * 0.03}s` }}
                    fill="var(--forest-2)" opacity={ativo ? 0.5 : 0.32} />
                )}
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
            {dados[hover].total > 0 && (
              <div style={{ fontSize: 12, color: 'var(--forest-2)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>recebido {fmt(dados[hover].total)}</div>
            )}
            {(dados[hover].pendente || 0) > 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--font-display)', fontWeight: 600 }}>a receber {fmt(dados[hover].pendente)}</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
