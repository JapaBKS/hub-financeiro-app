'use client';
import { useState } from 'react';
import { brl } from '../lib/format';

function Item({ it }) {
  const [open, setOpen] = useState(false);
  const temSub = Array.isArray(it.sub) && it.sub.length > 0;
  return (
    <div style={{ borderBottom: '1px solid var(--line-soft)' }}>
      <div
        onClick={temSub ? () => setOpen((o) => !o) : undefined}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '9px 20px', fontSize: 13, cursor: temSub ? 'pointer' : 'default',
        }}
      >
        <span style={{ color: 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {temSub && (
            <span style={{ fontSize: 11, color: 'var(--ink-faint)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>
          )}
          {it.label}
        </span>
        <b style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{brl(it.valor)}</b>
      </div>
      {temSub && open && (
        <div style={{ background: '#FAFBF9' }}>
          {it.sub.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 20px 7px 38px', fontSize: 12.5, borderTop: '1px solid var(--line-soft)' }}>
              <span style={{ color: 'var(--ink-faint)' }}>{s.label}</span>
              <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink-soft)', fontVariantNumeric: 'tabular-nums' }}>{brl(s.valor)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
          {itens.map((it, i) => <Item key={i} it={it} />)}
        </div>
      )}
    </section>
  );
}
