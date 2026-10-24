import { brl, pct } from '../../lib/format';

const mesLabelPadrao = (idx) => String(idx);

// Cada linha: mês (+ selo ATUAL) à esquerda; valor e variação EMPILHADOS à direita.
// Antes eram quatro itens lado a lado (mês, selo, valor, variação). No mês atual o selo
// "ATUAL" somava ~50px e, em tela de celular, empurrava o valor para fora da linha.
export default function HistoricoMensal({ historico, mesLabel = mesLabelPadrao }) {
  return (
    <div style={{ padding: '4px 0 8px' }}>
      {historico.map((h, n) => {
        const sobe = h.deltaVal != null && h.deltaVal >= 0;
        const atual = n === 0;
        return (
          <div key={h.idx} className="hist-linha" style={{
            background: atual ? 'var(--up-bg)' : 'transparent',
            borderLeft: atual ? '3px solid var(--forest)' : '3px solid transparent',
          }}>
            <div className="hist-mes">
              <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{mesLabel(h.idx)}</span>
              {atual && <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'var(--forest)', borderRadius: 4, padding: '1px 6px' }}>ATUAL</span>}
            </div>
            <div className="hist-valores">
              <b style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>{brl(h.value)}</b>
              <span style={{ fontSize: 12, fontVariantNumeric: 'tabular-nums', color: h.deltaVal == null ? 'var(--ink-faint)' : sobe ? 'var(--up)' : 'var(--down)' }}>
                {h.deltaVal == null ? '—' : `${sobe ? '▲' : '▼'} ${brl(Math.abs(h.deltaVal))} (${sobe ? '+' : '−'}${pct(Math.abs(h.deltaPct))})`}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
