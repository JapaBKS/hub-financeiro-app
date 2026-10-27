'use client';
import { useState } from 'react';

const CORES = ['#2E5E4E', '#B98A3C', '#6FA287', '#C9A24B', '#3E7C63', '#8C6BB1', '#D98C5F', '#5B8DB8', '#A8B545', '#9C5A5A', '#7A7A7A'];
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pctTxt = (n) => `${(n * 100).toFixed(2).replace('.', ',')}%`;

function arco(a0, a1, cx, cy, R, r) {
  const p = (a, rad) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  const grande = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R);
  const [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${grande} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${r} ${r} 0 ${grande} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
}

function fatias(dados, chave, R, r) {
  const soma = dados.reduce((s, d) => s + Math.max(0, d[chave]), 0);
  if (soma <= 0) return [];
  let ang = -Math.PI / 2;
  return dados.map((d, i) => {
    const frac = Math.max(0, d[chave]) / soma;
    const a0 = ang;
    const a1 = ang + frac * Math.PI * 2;
    ang = a1;
    return { ...d, i, frac, a0, a1, cheio: frac >= 0.999, R, r, cor: CORES[i % CORES.length] };
  }).filter((f) => f.frac > 0.0005);
}

export default function AlocacaoDonut({ dados, total }) {
  const [sel, setSel] = useState(null);

  const reais = fatias(dados, 'real', 92, 58);
  const escolhido = sel != null ? dados.find((d) => d.classe === sel) : null;

  const anel = (f, opacidade, chave) => (
    <g key={chave} onMouseEnter={() => setSel(f.classe)} onClick={() => setSel(sel === f.classe ? null : f.classe)} style={{ cursor: 'pointer' }}>
      {f.cheio ? (
        <circle cx="100" cy="100" r={(f.R + f.r) / 2} fill="none" stroke={f.cor} strokeWidth={f.R - f.r}
          opacity={sel && sel !== f.classe ? 0.3 : opacidade} />
      ) : (
        <path d={arco(f.a0, f.a1, 100, 100, f.R, f.r)} fill={f.cor}
          opacity={sel && sel !== f.classe ? 0.3 : opacidade} />
      )}
    </g>
  );

  return (
    <section className="card">
      <div className="card-h"><h2>Carteira por classe</h2></div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', padding: '10px 16px 4px', justifyContent: 'center' }}>
        <svg viewBox="0 0 200 200" style={{ width: 190, height: 190, flex: 'none' }} onMouseLeave={() => setSel(null)}>
          {reais.map((f) => anel(f, 1, `r-${f.classe}`))}
          <text x="100" y="95" textAnchor="middle" fontSize="9" fill="var(--ink-faint)">
            {escolhido ? escolhido.classe : 'patrimônio'}
          </text>
          <text x="100" y="110" textAnchor="middle" fontSize="13" fontWeight="600" fill="var(--ink)" fontFamily="var(--font-display)">
            {escolhido ? brl(escolhido.valor) : brl(total)}
          </text>
          {escolhido && (
            <text x="100" y="122" textAnchor="middle" fontSize="8" fill="var(--ink-faint)">
              {pctTxt(escolhido.real)} de {escolhido.temFixo ? brl(escolhido.fixo) : pctTxt(escolhido.alvo)}
            </text>
          )}
        </svg>

      </div>

      <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: '2px 16px 6px', textAlign: 'center' }}>
        gráfico = % real · na lista: <b>real</b> / alvo
      </p>

      <div style={{ padding: '4px 0 6px' }}>
        {dados.map((d, i) => {
          const ativo = sel === d.classe;
          return (
            <div key={d.classe}
              onMouseEnter={() => setSel(d.classe)} onMouseLeave={() => setSel(null)}
              onClick={() => setSel(ativo ? null : d.classe)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', cursor: 'pointer',
                borderBottom: '1px solid var(--line-soft)',
                background: ativo ? 'var(--surface-2)' : 'transparent',
                flexWrap: 'wrap',
              }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: CORES[i % CORES.length], flex: 'none' }} />
              <span style={{ fontSize: 12.5, fontWeight: 600, minWidth: 0, flex: 1 }}>{d.classe}</span>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-display)', whiteSpace: 'nowrap' }}>
                {pctTxt(d.real)} <span style={{ opacity: 0.6 }}>/ {d.temFixo ? brl(d.fixo) : pctTxt(d.alvo)}</span>
              </span>
              <span className={`tag ${d.tag}`} style={{ fontSize: 10 }}>{d.tagTxt}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
