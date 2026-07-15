'use client';
import { useState } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rot = (ym) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]}/${a.slice(2)}`; };

export default function ValorizacaoMensal({ dados }) {
  const [hover, setHover] = useState(null);

  if (!dados || dados.length === 0) {
    return (
      <section className="card" style={{ marginTop: 16, padding: 18, fontSize: 13, color: 'var(--ink-faint)' }}>
        Ainda não há dados suficientes pra calcular a valorização mensal.
      </section>
    );
  }

  const maxAbs = Math.max(...dados.map((d) => Math.abs(d.val)), 1);
  const soma = dados.reduce((s, d) => s + d.val, 0);

  const W = 700, H = 240, padL = 8, padR = 8, padT = 16, padB = 34;
  const n = dados.length;
  const bw = (W - padL - padR) / n;
  const barW = Math.min(bw * 0.62, 38);
  const y0 = padT + (H - padT - padB) / 2; // linha do zero (centro)
  const half = (H - padT - padB) / 2;
  const cx = (i) => padL + bw * i + bw / 2;
  const barH = (v) => (Math.abs(v) / maxAbs) * half;

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-h"><h2>Valorização mensal · negociados</h2></div>
      <div style={{ padding: '4px 20px 0', fontSize: 12, color: 'var(--ink-faint)' }}>
        só variação de preço (tira aportes) · acumulado no período:{' '}
        <b style={{ fontFamily: 'var(--font-display)', color: soma >= 0 ? 'var(--up)' : 'var(--down)' }}>{soma >= 0 ? '+' : '−'}{fmt(Math.abs(soma))}</b>
      </div>

      <div style={{ position: 'relative', padding: '8px 6px 4px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} onMouseLeave={() => setHover(null)}>
          <line x1={padL} y1={y0} x2={W - padR} y2={y0} stroke="var(--line)" strokeWidth="1" />
          {dados.map((d, i) => {
            const ativo = hover === i;
            const h = barH(d.val);
            const pos = d.val >= 0;
            const y = pos ? y0 - h : y0;
            const cor = pos ? 'var(--up)' : 'var(--down)';
            return (
              <g key={d.mes} onMouseEnter={() => setHover(i)}>
                <rect x={cx(i) - bw / 2} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
                <rect x={cx(i) - barW / 2} y={y} width={barW} height={Math.max(h, 1)} rx="2.5"
                  fill={cor} opacity={ativo ? 1 : 0.82} />
                {(n <= 14 || i % Math.ceil(n / 14) === 0) && (
                  <text x={cx(i)} y={H - 12} fontSize="9.5" fill="var(--ink-faint)" textAnchor="middle">{rot(d.mes)}</text>
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
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>{rot(dados[hover].mes)}</div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, color: dados[hover].val >= 0 ? 'var(--up)' : 'var(--down)' }}>
              {dados[hover].val >= 0 ? '+' : '−'}{fmt(Math.abs(dados[hover].val))}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 1 }}>aportes no mês: {fmt(dados[hover].aportes)}</div>
          </div>
        )}
      </div>
    </section>
  );
}
