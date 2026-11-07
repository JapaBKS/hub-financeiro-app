'use client';
import { useState, useRef, useEffect } from 'react';

const brlCurto = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return `R$ ${(n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  if (a >= 1e3) return `R$ ${(n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  return `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;
};
const brl = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Linhas com cruz + dica ao passar o dedo/mouse. "Aportado" fica em degrau cinza tracejado
// como referência; as outras usam as cores da legenda e têm rótulo no fim da linha.
export default function GraficoDesempenho({ meses, series }) {
  const [i, setI] = useState(null);
  // o desenho usa a largura real da tela (no celular os textos não encolhem)
  const caixa = useRef(null);
  const [W, setW] = useState(860);
  useEffect(() => {
    const el = caixa.current; if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const estreito = W < 520;
  const H = estreito ? 240 : 300;
  const M = { t: 14, r: estreito ? 64 : 92, b: 28, l: estreito ? 50 : 56 };
  const n = meses.length;
  const todos = series.flatMap((s) => s.valores.filter((v) => v != null));
  const max = Math.max(1, ...todos) * 1.06;
  const min = Math.min(0, ...todos);
  const x = (k) => M.l + (n <= 1 ? 0 : (k / (n - 1)) * (W - M.l - M.r));
  const y = (v) => M.t + (1 - (v - min) / (max - min)) * (H - M.t - M.b);
  const passo = Math.pow(10, Math.floor(Math.log10(max / 4)));
  const tick = [1, 2, 2.5, 5, 10].map((m) => m * passo).find((s) => max / s <= 5) || passo * 10;
  const ticks = []; for (let v = 0; v <= max; v += tick) ticks.push(v);
  const cadaX = Math.max(1, Math.ceil(n / (estreito ? 4 : 7)));

  const caminho = (vals, degrau) => {
    let d = ''; let ant = null;
    vals.forEach((v, k) => {
      if (v == null) { ant = null; return; }
      if (ant == null) d += `M${x(k)},${y(v)}`;
      else d += degrau ? `H${x(k)}V${y(v)}` : `L${x(k)},${y(v)}`;
      ant = v;
    });
    return d;
  };

  function mover(e) {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const k = Math.round(((px - M.l) / (W - M.l - M.r)) * (n - 1));
    setI(Math.max(0, Math.min(n - 1, k)));
  }

  // rótulos no fim das linhas, afastados para não encostar
  const finais = series.filter((s) => s.id !== 'aporte' && s.valores[n - 1] != null)
    .map((s) => ({ ...s, yy: y(s.valores[n - 1]) })).sort((a, b) => a.yy - b.yy);
  finais.forEach((f, k) => { if (k > 0 && f.yy - finais[k - 1].yy < 14) f.yy = finais[k - 1].yy + 14; });

  return (
    <div className="dp-grafico">
      <div className="dp-legenda">
        {series.map((s) => (
          <span key={s.id}><i className={`dp-cor ${s.id}`} aria-hidden="true" />{s.nome}</span>
        ))}
      </div>
      <div ref={caixa} style={{ position: 'relative' }}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Evolução da carteira comparada a CDI, Ibovespa e inflação"
          onMouseMove={mover} onMouseLeave={() => setI(null)} onTouchStart={(e) => mover({ clientX: e.touches[0].clientX, currentTarget: e.currentTarget })}
          onTouchMove={(e) => mover({ clientX: e.touches[0].clientX, currentTarget: e.currentTarget })} style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'pan-y' }}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} className="dp-grade" />
              <text x={M.l - 8} y={y(v) + 4} textAnchor="end" className="dp-eixo">{estreito ? brlCurto(v).replace('R$ ', '') : brlCurto(v)}</text>
            </g>
          ))}
          {meses.map((m, k) => ((k % cadaX === 0 && n - 1 - k >= cadaX * 0.6) || k === n - 1) && (
            <text key={m} x={x(k)} y={H - 8} textAnchor="middle" className="dp-eixo">{m}</text>
          ))}
          {series.map((s) => (
            <path key={s.id} d={caminho(s.valores, s.id === 'aporte')} className={`dp-linha ${s.id}`} />
          ))}
          {finais.map((f) => (
            <text key={f.id} x={W - M.r + 8} y={f.yy + 4} className="dp-rotulo">{f.nome}</text>
          ))}
          {i != null && (
            <g>
              <line x1={x(i)} x2={x(i)} y1={M.t} y2={H - M.b} className="dp-cruz" />
              {series.map((s) => s.valores[i] != null && (
                <circle key={s.id} cx={x(i)} cy={y(s.valores[i])} r="4.5" className={`dp-ponto ${s.id}`} />
              ))}
            </g>
          )}
        </svg>
        {i != null && (
          <div className="dp-dica" style={x(i) > W / 2 ? { left: M.l + 4 } : { right: M.r }} /* do lado oposto ao dedo, sem sair da tela */>
            <b>{meses[i]}</b>
            {series.map((s) => s.valores[i] != null && (
              <div key={s.id}><span><i className={`dp-cor ${s.id}`} aria-hidden="true" />{s.nome}</span><span>{brl(s.valores[i])}</span></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
