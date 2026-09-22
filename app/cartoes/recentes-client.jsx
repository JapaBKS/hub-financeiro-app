'use client';
import { useState } from 'react';
import { CATEGORIAS } from '../../lib/dominio/categorias';
import { brl as fmt } from '../../lib/format';

export default function Recentes({ purchases, cards }) {
  const [lista, setLista] = useState(purchases);
  const [busy, setBusy] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [busca, setBusca] = useState('');

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
      paiPct: p.pai_pct != null ? String(p.pai_pct) : '50',
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
    const paiPctCalc = form.pagador === 'eu' ? 0 : form.pagador === 'pai' ? 100 : Math.min(100, Math.max(0, Number(form.paiPct) || 0));
    const res = await fetch('/api/card-purchases', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, card_id: form.card_id, description: form.description,
        categoria: form.categoria, pai_pct: paiPctCalc,
        installment_amount: valorParcela,
        installments_count: nParc, first_billed_month: form.mes + '-01',
      }),
    });
    if (res.ok) {
      const pagadorCalc = paiPctCalc <= 0 ? 'eu' : paiPctCalc >= 100 ? 'pai' : 'dividido';
      setLista((l) => l.map((p) => (p.id === id ? {
        ...p, card_id: Number(form.card_id),
        cartao: cards.find((c) => String(c.id) === form.card_id)?.name || p.cartao,
        description: form.description, categoria: form.categoria, pagador: pagadorCalc, pai_pct: paiPctCalc,
        installments_count: nParc,
        installment_amount: valorParcela, first_billed_month: form.mes + '-01',
      } : p)));
      setEditId(null);
    }
    setBusy(null);
  }

  if (!lista.length) return null;

  const termo = busca.trim().toLowerCase();
  const filtrada = termo
    ? lista.filter((p) => (p.description || '').toLowerCase().includes(termo) || (p.cartao || '').toLowerCase().includes(termo) || (p.categoria || '').toLowerCase().includes(termo))
    : lista;

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Compras</h2>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{filtrada.length} de {lista.length}</span>
      </div>
      <div style={{ padding: '8px 20px 0' }}>
        <input className="campo" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por descrição, cartão ou categoria" />
      </div>
      <div style={{ marginTop: 6 }}>
        {filtrada.map((p) => {
          if (editId === p.id) {
            return (
              <div key={p.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--line-soft)' }}>
                <input className="campo" style={{ marginBottom: 8 }} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descrição" />
                <div className="grid2">
                  <select className="campo" value={form.card_id} onChange={(e) => setForm({ ...form, card_id: e.target.value })}>
                    {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input className="campo" type="month" value={form.mes} onChange={(e) => setForm({ ...form, mes: e.target.value })} />
                  <select className="campo" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                    {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[['eu', 'Eu'], ['pai', 'Pai'], ['dividido', 'Div.']].map(([v, l]) => (
                      <button type="button" key={v} onClick={() => setForm({ ...form, pagador: v })} style={{
                        flex: 1, padding: '7px 2px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        border: '1px solid ' + (form.pagador === v ? 'var(--forest)' : 'var(--line)'),
                        background: form.pagador === v ? 'var(--forest)' : 'var(--surface)', color: form.pagador === v ? '#fff' : 'var(--ink-soft)',
                      }}>{l}</button>
                    ))}
                  </div>
                  <input className="campo" type="number" step="any" value={form.parcela} onChange={(e) => setForm({ ...form, parcela: e.target.value })} placeholder="Valor da parcela" />
                  <input className="campo" type="number" min="1" value={form.installments_count} onChange={(e) => setForm({ ...form, installments_count: e.target.value })} placeholder="Parcelas" />
                </div>
                {form.pagador === 'dividido' && (
                  <input className="campo" style={{ marginTop: 8 }} type="number" min="0" max="100" value={form.paiPct}
                    onChange={(e) => setForm({ ...form, paiPct: e.target.value })} placeholder="% que o pai paga" />
                )}
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
                    background: 'var(--surface)', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600,
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
                  {p.purchased_at && <span>· {(p.purchased_at || '').slice(0, 10).split('-').reverse().join('/')}</span>}
                  {p.categoria && <span>· {p.categoria}</span>}
                  {p.pagador === 'pai' && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: 'var(--brass)', background: 'var(--brass-bg, #F3ECD9)', borderRadius: 4, padding: '1px 6px' }}>PAI</span>
                  )}
                  {p.pagador === 'dividido' && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: 'var(--brass)', background: 'var(--brass-bg, #F3ECD9)', borderRadius: 4, padding: '1px 6px' }}>PAI {Math.round(Number(p.pai_pct))}%</span>
                  )}
                </div>
              </div>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.installment_amount)}</span>
              <button onClick={() => abrirEdicao(p)} title="Editar" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 14, padding: '0 2px' }}>✎</button>
              <button onClick={() => apagar(p.id)} disabled={busy === p.id} title="Apagar" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}>{busy === p.id ? '…' : '×'}</button>
            </div>
          );
        })}
        {filtrada.length === 0 && (
          <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>Nenhuma compra encontrada para “{busca}”.</div>
        )}
      </div>
    </section>
  );
}
