'use client';
import { useState } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const inp = {
  padding: '9px 11px', borderRadius: 9, border: '1px solid var(--line)', fontSize: 14,
  fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: '#fff', width: '100%',
};

export default function SaldosClient({ holdings, classes }) {
  const [lista, setLista] = useState(holdings);
  const [vals, setVals] = useState(() => Object.fromEntries(holdings.map((h) => [h.id, String(h.amount)])));
  const [busy, setBusy] = useState(null);
  const [novo, setNovo] = useState({ label: '', class_id: classes[0]?.id ? String(classes[0].id) : '', amount: '' });
  const [addMsg, setAddMsg] = useState('');

  const total = lista.reduce((s, h) => s + Number(vals[h.id] ?? h.amount ?? 0), 0);

  async function salvar(id) {
    setBusy(id);
    const res = await fetch('/api/manual-holdings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, amount: vals[id] }),
    });
    if (res.ok) setLista((l) => l.map((h) => (h.id === id ? { ...h, amount: Number(vals[id]) } : h)));
    setBusy(null);
  }

  async function apagar(id) {
    if (!confirm('Remover este saldo?')) return;
    setBusy(id);
    const res = await fetch('/api/manual-holdings', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    });
    if (res.ok) setLista((l) => l.filter((h) => h.id !== id));
    setBusy(null);
  }

  async function adicionar() {
    if (!novo.label || !novo.class_id || novo.amount === '') { setAddMsg('Preencha nome, classe e valor.'); return; }
    setBusy('novo'); setAddMsg('');
    const res = await fetch('/api/manual-holdings', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(novo),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      const classe = classes.find((c) => String(c.id) === novo.class_id)?.name;
      const novoItem = { id: data.id, label: novo.label, amount: Number(novo.amount), class_id: Number(novo.class_id), classe };
      setLista((l) => [...l, novoItem]);
      setVals((v) => ({ ...v, [data.id]: String(novo.amount) }));
      setNovo({ label: '', class_id: classes[0]?.id ? String(classes[0].id) : '', amount: '' });
    } else {
      setAddMsg(data.erro || 'Não foi possível adicionar.');
    }
    setBusy(null);
  }

  return (
    <div>
      <div className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 3 }}>Total em saldos manuais</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 22 }}>{fmt(total)}</div>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        {lista.map((h) => {
          const mudou = String(vals[h.id]) !== String(h.amount);
          return (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{h.label}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{h.classe}</div>
              </div>
              <input
                style={{ ...inp, width: 130, textAlign: 'right', fontFamily: 'var(--font-display)' }}
                type="number" step="any" value={vals[h.id] ?? ''}
                onChange={(e) => setVals((v) => ({ ...v, [h.id]: e.target.value }))}
              />
              <button onClick={() => salvar(h.id)} disabled={!mudou || busy === h.id} style={{
                padding: '9px 13px', borderRadius: 9, border: 0, cursor: mudou ? 'pointer' : 'default',
                background: mudou ? 'var(--forest)' : '#E7EAE4', color: mudou ? '#fff' : 'var(--ink-faint)',
                fontSize: 13, fontWeight: 600,
              }}>{busy === h.id ? '…' : 'Salvar'}</button>
              <button onClick={() => apagar(h.id)} disabled={busy === h.id} title="Remover" style={{
                border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18, padding: '0 2px',
              }}>×</button>
            </div>
          );
        })}
        {lista.length === 0 && <div style={{ padding: 18, fontSize: 13, color: 'var(--ink-faint)' }}>Nenhum saldo manual.</div>}
      </section>

      <section className="card" style={{ padding: '18px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 12 }}>+ Adicionar saldo</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input style={inp} value={novo.label} onChange={(e) => setNovo({ ...novo, label: e.target.value })} placeholder="Nome (ex.: Mercado Pago)" />
          <select style={inp} value={novo.class_id} onChange={(e) => setNovo({ ...novo, class_id: e.target.value })}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input style={inp} type="number" step="any" value={novo.amount} onChange={(e) => setNovo({ ...novo, amount: e.target.value })} placeholder="Valor (R$)" />
          <button onClick={adicionar} disabled={busy === 'novo'} style={{
            padding: '9px', borderRadius: 9, border: 0, cursor: 'pointer', background: 'var(--forest)', color: '#fff', fontSize: 14, fontWeight: 600,
          }}>{busy === 'novo' ? 'Adicionando…' : 'Adicionar'}</button>
        </div>
        {addMsg && <p style={{ marginTop: 10, fontSize: 12, color: 'var(--down)' }}>{addMsg}</p>}
      </section>
    </div>
  );
}
