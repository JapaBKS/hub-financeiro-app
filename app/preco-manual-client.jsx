'use client';
import { useState } from 'react';

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PrecoManual({ ticker, valor }) {
  const [editando, setEditando] = useState(false);
  const [v, setV] = useState(valor != null ? String(valor) : '');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    const price = Number(String(v).replace(',', '.'));
    if (!(price > 0)) return;
    setSalvando(true);
    await fetch('/api/manual-price', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker, price }) });
    window.location.reload();
  }
  async function limpar() {
    setSalvando(true);
    await fetch('/api/manual-price', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker }) });
    window.location.reload();
  }

  const btn = { fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--line)', background: 'var(--surface)' };

  if (!editando) {
    return (
      <button onClick={() => setEditando(true)} title="definir preço manual (usado só sem cotação automática)"
        style={{ ...btn, color: valor != null ? 'var(--forest-2)' : 'var(--amber)' }}>
        {valor != null ? `manual ${brl(valor)} ✎` : '✎ preço manual'}
      </button>
    );
  }
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder="0,00" autoFocus
        style={{ width: 72, padding: '4px 7px', borderRadius: 6, border: '1px solid var(--amber)', fontSize: 12, background: 'var(--surface)', color: 'var(--ink)', textAlign: 'right' }} />
      <button onClick={salvar} disabled={salvando} style={{ ...btn, border: 0, background: 'var(--forest)', color: '#fff' }}>ok</button>
      {valor != null && <button onClick={limpar} disabled={salvando} style={{ ...btn, color: 'var(--down)' }}>✕</button>}
      <button onClick={() => setEditando(false)} style={{ ...btn, color: 'var(--ink-faint)' }}>cancelar</button>
    </span>
  );
}
