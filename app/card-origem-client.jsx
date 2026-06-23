'use client';
import { useState } from 'react';
import { brl } from '../lib/format';

export default function CardOrigem({ titulo, total, cor, itens }) {
  const [aberto, setAberto] = useState(false);
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <button
        onClick={() => setAberto((a) => !a)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 20px', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>{titulo}</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22, color: cor }}>{brl(total)}</div>
        </div>
        <span style={{ color: 'var(--ink-faint)', fontSize: 16, transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
      </button>

      {aberto && (
        <div style={{ borderTop: '1px solid var(--line-soft)' }}>
          {itens.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 20px', fontSize: 13, borderBottom: i < itens.length - 1 ? '1px solid var(--line-soft)' : 'none' }}>
              <span style={{ color: 'var(--ink-soft)' }}>{it.label}</span>
              <b style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{brl(it.valor)}</b>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
