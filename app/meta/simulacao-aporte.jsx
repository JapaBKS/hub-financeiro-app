'use client';
import { useState } from 'react';
import { Campo } from '../ui/campos';
import { brl } from '../../lib/format';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotulo = (i) => `${MESES[i % 12]}/${Math.floor(i / 12)}`;
const num = (v) => Number(String(v).replace(',', '.')) || 0;

// Mesma fórmula da projeção (valorização + proventos sobre o saldo), partindo do valor de hoje,
// mas com um aporte FIXO por mês: serve para testar "e se eu investir só os 30%?".
function mesesAte(valorHoje, alvo, aporte, cresc, divPct) {
  if (valorHoje >= alvo) return 0;
  let saldo = valorHoje, div = saldo * divPct, m = 0;
  while (saldo < alvo && m < 1200) {
    m++;
    saldo = saldo * (1 + cresc) + aporte + div;
    div = saldo * divPct;
  }
  return saldo >= alvo ? m : null; // null = não chega (aporte zero e rendimento insuficiente)
}

export default function SimulacaoAporte({ valorHoje, idxHoje, cresc, divPct, marcos, aporteInicial = 1196 }) {
  const [aporte, setAporte] = useState(String(aporteInicial));
  const ap = num(aporte);

  return (
    <section className="card" style={{ marginBottom: 16, padding: '4px 0 16px' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Simulação de aporte</h2>
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>partindo de {brl(valorHoje)}</span>
      </div>

      <div style={{ padding: '4px 20px 0' }}>
        <label className="calc30-rot">Aporte fixo por mês (R$)</label>
        <Campo numerico largura="100%" type="number" step="any" min="0" inputMode="decimal" placeholder="0,00"
          value={aporte} onChange={(e) => setAporte(e.target.value)} />
        <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: '6px 0 0' }}>
          Começa com os 30% do salário líquido (≈ R$ 1.196). Mude para testar com valor extra.
        </p>
      </div>

      <div style={{ marginTop: 10 }}>
        <div className="sim-linha sim-cab"><span>Marco</span><span>Com {brl(ap)}/mês</span><span>Plano atual</span></div>
        {marcos.map((m) => {
          const meses = mesesAte(valorHoje, m.alvo, ap, cresc, divPct);
          const atingido = valorHoje >= m.alvo;
          const dif = meses == null ? null : idxHoje + meses - m.plano; // + = depois do plano
          return (
            <div key={m.alvo} className="sim-linha">
              <span style={{ fontWeight: 600 }}>{brl(m.alvo)}</span>
              <span style={{ fontWeight: 600, color: atingido ? 'var(--up)' : 'var(--forest-2)' }}>
                {atingido ? '✓ atingido' : meses == null ? 'não chega' : (
                  <>{rotulo(idxHoje + meses)}<small>{meses >= 12 ? ` · ${Math.floor(meses / 12)}a ${meses % 12}m` : ` · ${meses}m`}</small></>
                )}
              </span>
              <span style={{ color: 'var(--ink-soft)' }}>
                {atingido ? '✓' : rotulo(m.plano)}
                {!atingido && dif != null && dif !== 0 && (
                  <small style={{ display: 'block', color: dif > 0 ? 'var(--amber)' : 'var(--up)' }}>
                    {dif > 0 ? `+${dif}` : `−${Math.abs(dif)}`} {Math.abs(dif) === 1 ? 'mês' : 'meses'}
                  </small>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: '8px 20px 0' }}>
        Mesma fórmula da projeção (valorização de 1% ao mês + proventos de 0,12%), sem reajuste do aporte. A diferença é contra o "No seu ritmo" do plano (aporte de R$ 1.000 em 2024 com +10% ao ano).
      </p>
    </section>
  );
}
