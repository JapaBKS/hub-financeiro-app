'use client';
import { useState } from 'react';

const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtData = (iso) => (iso || '').slice(0, 10).split('-').reverse().join('/');
const inp = {
  padding: '7px 9px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13,
  fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: 'var(--surface)', width: '100%',
};

export default function ListaNegociacoes({ trades }) {
  const [lista, setLista] = useState(trades);
  const [busy, setBusy] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('todos');

  const filtradas = lista.filter((t) => {
    if (tipo !== 'todos' && t.side !== tipo) return false;
    if (busca && !t.ticker.includes(busca.toUpperCase())) return false;
    return true;
  });

  async function apagar(id) {
    if (!confirm('Apagar este lançamento? Isso recalcula sua carteira.')) return;
    setBusy(id);
    const res = await fetch('/api/trades', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    if (res.ok) setLista((l) => l.filter((t) => t.id !== id));
    setBusy(null);
  }
  function abrirEdicao(t) {
    setEditId(t.id);
    setForm({ traded_at: (t.traded_at || '').slice(0, 10), side: t.side, quantity: t.quantity, price: t.price });
  }
  async function salvar(id) {
    setBusy(id);
    const res = await fetch('/api/trades', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...form }) });
    if (res.ok) {
      setLista((l) => l.map((t) => (t.id === id ? { ...t, ...form } : t)));
      setEditId(null);
    }
    setBusy(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input style={{ ...inp, flex: 1 }} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar ticker (ex.: PETR4)" />
        <select style={{ ...inp, width: 130 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="todos">Todas</option>
          <option value="compra">Compras</option>
          <option value="venda">Vendas</option>
        </select>
      </div>

      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8 }}>
        {filtradas.length} {filtradas.length === 1 ? 'negociação' : 'negociações'}
      </div>

      <section className="card">
        {filtradas.map((t) => {
          if (editId === t.id) {
            return (
              <div key={t.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--line-soft)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 8 }}>{t.ticker}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input style={inp} type="date" value={form.traded_at} onChange={(e) => setForm({ ...form, traded_at: e.target.value })} />
                  <select style={inp} value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
                    <option value="compra">Compra</option>
                    <option value="venda">Venda</option>
                  </select>
                  <input style={inp} type="number" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Qtd" />
                  <input style={inp} type="number" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Preço" />
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => salvar(t.id)} disabled={busy === t.id} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 0, cursor: 'pointer', background: 'var(--forest)', color: '#fff', fontSize: 13, fontWeight: 600 }}>{busy === t.id ? 'Salvando…' : 'Salvar'}</button>
                  <button onClick={() => setEditId(null)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600 }}>Cancelar</button>
                </div>
              </div>
            );
          }
          return (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid var(--line-soft)', fontSize: 13 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 5, color: t.side === 'compra' ? 'var(--up)' : 'var(--down)', background: t.side === 'compra' ? 'var(--up-bg)' : 'var(--down-bg)' }}>{t.side === 'compra' ? 'C' : 'V'}</span>
              <b style={{ fontFamily: 'var(--font-display)', minWidth: 58 }}>{t.ticker}</b>
              <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>{fmtData(t.traded_at)}</span>
              <span style={{ marginLeft: 'auto', textAlign: 'right', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                <span style={{ display: 'block', fontWeight: 600, color: t.side === 'compra' ? 'var(--down)' : 'var(--up)' }}>
                  {t.side === 'compra' ? '−' : '+'}{fmt(Number(t.quantity) * Number(t.price))}
                </span>
                <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-faint)' }}>
                  {Number(t.quantity).toLocaleString('pt-BR')} × {fmt(t.price)}
                </span>
              </span>
              <button onClick={() => abrirEdicao(t)} title="Editar" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14, padding: '0 2px' }}>✎</button>
              <button onClick={() => apagar(t.id)} disabled={busy === t.id} title="Apagar" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>{busy === t.id ? '…' : '×'}</button>
            </div>
          );
        })}
        {filtradas.length === 0 && <div style={{ padding: 18, fontSize: 13, color: 'var(--ink-faint)' }}>Nenhuma negociação encontrada.</div>}
      </section>
    </div>
  );
}
