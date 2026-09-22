'use client';
import { useState } from 'react';

import { brl as fmt } from '../../lib/format';
const fmtData = (iso) => (iso || '').slice(0, 10).split('-').reverse().join('/');

export default function Recentes({ trades }) {
  const [lista, setLista] = useState(trades);
  const [busy, setBusy] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});

  async function apagar(id) {
    if (!confirm('Apagar este lançamento? Isso recalcula sua carteira.')) return;
    setBusy(id);
    const res = await fetch('/api/trades', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    });
    if (res.ok) setLista((l) => l.filter((t) => t.id !== id));
    setBusy(null);
  }

  function abrirEdicao(t) {
    setEditId(t.id);
    setForm({ traded_at: (t.traded_at || '').slice(0, 10), side: t.side, quantity: t.quantity, price: t.price });
  }

  async function salvar(id) {
    setBusy(id);
    const res = await fetch('/api/trades', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...form }),
    });
    if (res.ok) {
      setLista((l) => l.map((t) => (t.id === id ? { ...t, ...form } : t)));
      setEditId(null);
    }
    setBusy(null);
  }

  if (!lista.length) return null;

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-h"><h2>Últimos lançamentos</h2></div>
      <div style={{ marginTop: 6 }}>
        {lista.map((t) => {
          const editando = editId === t.id;
          if (editando) {
            return (
              <div key={t.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--line-soft)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 8 }}>{t.ticker}</div>
                <div className="grid2">
                  <input className="campo" type="date" value={form.traded_at} onChange={(e) => setForm({ ...form, traded_at: e.target.value })} />
                  <select className="campo" value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
                    <option value="compra">Compra</option>
                    <option value="venda">Venda</option>
                  </select>
                  <input className="campo" type="number" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Qtd" />
                  <input className="campo" type="number" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Preço" />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => salvar(t.id)} disabled={busy === t.id} style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 0, cursor: 'pointer',
                    background: 'var(--forest)', color: '#fff', fontSize: 13, fontWeight: 600,
                  }}>{busy === t.id ? 'Salvando…' : 'Salvar'}</button>
                  <button onClick={() => setEditId(null)} style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer',
                    background: 'var(--surface)', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600,
                  }}>Cancelar</button>
                </div>
              </div>
            );
          }
          return (
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
              <button onClick={() => abrirEdicao(t)} title="Editar" style={{
                border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14, padding: '0 2px',
              }}>✎</button>
              <button onClick={() => apagar(t.id)} disabled={busy === t.id} title="Apagar" style={{
                border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18, lineHeight: 1, padding: '0 2px',
              }}>{busy === t.id ? '…' : '×'}</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
