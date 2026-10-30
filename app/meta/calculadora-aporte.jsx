'use client';
import { useState } from 'react';
import { Campo } from '../ui/campos';
import { brl } from '../../lib/format';

const PCT = 0.30; // regra: de tudo que entra, 30% é separado para investir

// Calculadora da regra dos 30%: nada é salvo, só ajuda no momento de separar o dinheiro.
export default function CalculadoraAporte() {
  const [valor, setValor] = useState('');
  const x = Number(String(valor).replace(',', '.')) || 0;
  const separar = x * PCT;
  const resto = x - separar;

  return (
    <section className="card" style={{ marginBottom: 16, padding: '4px 0 16px' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Regra dos 30%</h2>
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>do que entrar, separe 30%</span>
      </div>
      <div style={{ padding: '4px 20px 0' }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 6 }}>Recebi (R$)</label>
        <Campo numerico largura="100%" type="number" step="any" min="0" inputMode="decimal" placeholder="0,00"
          value={valor} onChange={(e) => setValor(e.target.value)} />

        <div className="calc30">
          <div className="calc30-bloco calc30-sep">
            <span>Separar para investir</span>
            <b>{brl(separar)}</b>
          </div>
          <div className="calc30-bloco">
            <span>Resto (70%)</span>
            <b>{brl(resto)}</b>
          </div>
        </div>
      </div>
    </section>
  );
}
