'use client';
import { useState } from 'react';
import { brl } from '../lib/format';

function Item({ it, nivel = 0 }) {
  const [aberto, setAberto] = useState(false);
  const temSub = it.sub && it.sub.length > 0;
  return (
    <>
      <div
        onClick={temSub ? () => setAberto((a) => !a) : undefined}
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '9px 20px', paddingLeft: 20 + nivel * 18, fontSize: 13,
          borderBottom: '1px solid var(--line-soft)',
          cursor: temSub ? 'pointer' : 'default',
          background: nivel > 0 ? '#FAFBF9' : 'transparent',
        }}
      >
        <span style={{ color: nivel > 0 ? 'var(--ink-faint)' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6 }}>
          {temSub && <span style={{ fontSize: 10, color: 'var(--ink-faint)', transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</span>}
          {it.label}
        </span>
        <b style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{brl(it.valor)}</b>
      </div>
      {temSub && aberto && it.sub.map((s, i) => <Item key={i} it={s} nivel={nivel + 1} />)}
    </>
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
