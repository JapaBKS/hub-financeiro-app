'use client';
import { useState } from 'react';

const CATEGORIAS = ['Comida', 'Mercado', 'Lazer', 'Transporte', 'Saúde', 'Casa', 'Assinaturas', 'Roupas', 'Educação', 'Presentes', 'Outros'];

const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const inp = {
  padding: '7px 9px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13,
  fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: '#fff', width: '100%',
};

export default function Recentes({ purchases, cards }) {
  const [lista, setLista] = useState(purchases);
  const [busy, setBusy] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});

  async function apagar(id) {
    if (!confirm('Apagar esta compra? Some de todas as faturas (inclusive futuras).')) return;
    setBusy(id);
    const res = await fetch('/api/card-purchases', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    });
    if (res.ok) setLista((l) => l.filter((p) => p.id !== id));
    setBusy(null);
  }

  function abrirEdicao(p) {
    setEditId(p.id);
    setForm({
      card_id: String(p.card_id),
      description: p.description,
      categoria: p.categoria || 'Outros',
      pagador: p.pagador || 'eu',
      parcela: Number(p.installment_amount).toFixed(2),
      installments_count: p.installments_count,
      mes: (p.first_billed_month || '').slice(0, 7),
    });
  }

  function dividirTotal() {
    const total = Number(String(prompt('Valor total da compra (R$):') || '').replace(',', '.'));
    const nParc = Math.max(1, Number(form.installments_count) || 1);
    if (total > 0) setForm((f) => ({ ...f, parcela: (total / nParc).toFixed(2) }));
  }

  async function salvar(id) {
    setBusy(id);
    const nParc = Math.max(1, Number(form.installments_count) || 1);
    const valorParcela = Number(form.parcela) || 0;
    const res = await fetch('/api/card-purchases', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, card_id: form.card_id, description: form.description,
        categoria: form.categoria, pagador: form.pagador,
        installment_amount: valorParcela,
        installments_count: nParc, first_billed_month: form.mes + '-01',
      }),
    });
    if (res.ok) {
      setLista((l) => l.map((p) => (p.id === id ? {
        ...p, card_id: Number(form.card_id),
        cartao: cards.find((c) => String(c.id) === form.card_id)?.name || p.cartao,
        description: form.description, categoria: form.categoria, pagador: form.pagador,
        installments_count: nParc,
        installment_amount: valorParcela, first_billed_month: form.mes + '-01',
      } : p)));
      setEditId(null);
    }
    setBusy(null);
  }

  if (!lista.length) return null;

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-h"><h2>Últimas compras</h2></div>
      <div style={{ marginTop: 6 }}>
        {lista.map((p) => {
          if (editId === p.id) {
            return (
              <div key={p.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--line-soft)' }}>
                <input style={{ ...inp, marginBottom: 8 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select style={inp} value={form.card_id} onChange={(e) => setForm({ ...form, card_id: e.target.value })}>
                    {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input style={inp} type="month" value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })} />
                  <select style={inp} value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select style={inp} value={form.pagador} onChange={(e) => setForm({ ...form, pagador: e.target.value })}>
                    <option value="eu">Eu pago</option>
                    <option value="pai">Pai paga</option>
                  </select>
                  <input style={inp} type="number" step="any" value={form.parcela} onChange={(e) => setForm({ ...form, parcela: e.target.value })} placeholder="Valor da parcela" />
                  <input style={inp} type="number" min="1" value={form.installments_count} onChange={(e) => setForm({ ...form, installments_count: e.target.value })} placeholder="Parcelas" />
                </div>
                <button type="button" onClick={dividirTotal} style={{
                  marginTop: 6, border: 0, background: 'transparent', color: 'var(--forest-2)',
                  fontSize: 12, fontWeight: 500, cursor: 'pointer', padding: 0,
                }}>dividir um total nas parcelas →</button>
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button onClick={() => salvar(p.id)} disabled={busy === p.id} style={{
                    flex: 1, padding: '8px', borderRadius: 8, border: 0, cursor: 'pointer',
                    background: 'var(--forest)', color: '#fff', fontSize: 13, fontWeight: 600,
                  }}>{busy === p.id ? 'Salvando…' : 'Salvar'}</button>
                  <button onClick={() => setEditId(null)} style={{
                    padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer',
                    background: '#fff', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600,
                  }}>Cancelar</button>
                </div>
              </div>
            );
          }
          return (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px',
              borderBottom: '1px solid var(--line-soft)', fontSize: 13,
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>
                  {p.description}
                  {p.installments_count > 1 && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--forest-2)', background: 'var(--up-bg)', borderRadius: 5, padding: '1px 6px', marginLeft: 6 }}>
                      {p.installments_count}x
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span>{p.cartao}</span>
                  {p.categoria && <span>· {p.categoria}</span>}
                  {p.pagador === 'pai' && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: 'var(--brass)', background: 'var(--brass-bg, #F3ECD9)', borderRadius: 4, padding: '1px 6px' }}>PAI</span>
                  )}
                </div>
              </div>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.installment_amount)}</span>
              <button onClick={() => abrirEdicao(p)} title="Editar" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14, padding: '0 2px' }}>✎</button>
              <button onClick={() => apagar(p.id)} disabled={busy === p.id} title="Apagar" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>{busy === p.id ? '…' : '×'}</button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
