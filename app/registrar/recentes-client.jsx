'use client';
import { useState } from 'react';

const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso) => (iso || '').slice(0, 10).split('-').reverse().join('/');

export default function Recentes({ trades }) {
  const [lista, setLista] = useState(trades);
  const [busy, setBusy] = useState(null);

  async function apagar(id) {
    if (!confirm('Apagar este lançamento? Isso recalcula sua carteira.')) return;
    setBusy(id);
    const res = await fetch('/api/trades', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    if (res.ok) setLista((l) => l.filter((t) => t.id !== id));
    setBusy(null);
  }

  if (!lista.length) return null;

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-h"><h2>Últimos lançamentos</h2></div>
      <div style={{ marginTop: 6 }}>
        {lista.map((t) => (
          <div key={t.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
            borderBottom: '1px solid var(--line-soft)', fontSize: 13,
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5,
              color: t.side === 'compra' ? 'var(--up)' : 'var(--down)',
              background: t.side === 'compra' ? 'var(--up-bg)' : 'var(--down-bg)',
            }}>{t.side === 'compra' ? 'C' : 'V'}</span>
            <b style={{ fontFamily: 'var(--font-display)', minWidth: 58 }}>{t.ticker}</b>
            <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>{fmtData(t.traded_at)}</span>
            <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
              {Number(t.quantity).toLocaleString('pt-BR')} × {fmt(t.price)}
            </span>
            <button onClick={() => apagar(t.id)} disabled={busy === t.id} title="Apagar" style={{
              border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)',
              fontSize: 18, lineHeight: 1, padding: '0 2px',
            }}>{busy === t.id ? '…' : '×'}</button>
          </div>
        ))}
      </div>
    </section>
  );
}
