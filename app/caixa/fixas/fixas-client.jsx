'use client';
import { useState } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const inp = { padding: '9px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13.5, fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: '#fff', width: '100%' };

const vazio = { name: '', category: '', amount: '', schedule_kind: 'dia_mes', day_of_month: '10', weekday: '5', is_variable: false };

function agendaLabel(b) {
  if (b.schedule_kind === 'semanal') return `toda ${DIAS[b.weekday]}`;
  return `dia ${b.day_of_month} (útil)`;
}

export default function FixasClient({ bills, categorias }) {
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(null); // null = fechado; objeto = criando/editando
  const [salvando, setSalvando] = useState(false);

  function abrirNovo() { setEditId(null); setForm({ ...vazio }); }
  function abrirEdit(b) {
    setEditId(b.id);
    setForm({
      name: b.name, category: b.category, amount: String(b.amount),
      schedule_kind: b.schedule_kind,
      day_of_month: String(b.day_of_month || '10'),
      weekday: String(b.weekday ?? '5'),
      is_variable: !!b.is_variable,
    });
  }

  async function salvar() {
    if (!form.name.trim()) return;
    setSalvando(true);
    const body = {
      id: editId || undefined,
      name: form.name, category: form.category, amount: form.amount,
      schedule_kind: form.schedule_kind,
      day_of_month: form.day_of_month, weekday: form.weekday,
      is_variable: form.is_variable,
    };
    const res = await fetch('/api/recurring', { method: editId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setSalvando(false);
    if (res.ok) window.location.reload();
  }
  async function apagar(b) {
    if (!confirm(`Apagar a conta fixa "${b.name}"?`)) return;
    await fetch('/api/recurring', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id }) });
    window.location.reload();
  }
  async function toggleAtivo(b) {
    await fetch('/api/recurring', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: b.id, onlyActive: !b.active }) });
    window.location.reload();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', margin: 0 }}>Contas que se repetem todo mês. Você lança elas no Caixa pelo botão "contas do mês".</p>
        <button onClick={abrirNovo} style={{ padding: '8px 14px', borderRadius: 9, border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: 'var(--forest)', color: '#fff', whiteSpace: 'nowrap' }}>+ nova</button>
      </div>

      {form && (
        <section className="card" style={{ padding: 16, marginBottom: 14 }}>
          <input style={{ ...inp, marginBottom: 8 }} placeholder="Nome (ex.: PUC, Vivo+Copel)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input style={inp} placeholder="Categoria" list="cats-fixas" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <input style={inp} type="number" step="0.01" placeholder="Valor sugerido" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </div>
          <datalist id="cats-fixas">{categorias.map((c) => <option key={c} value={c} />)}</datalist>

          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={() => setForm({ ...form, schedule_kind: 'dia_mes' })} style={{ flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12.5, border: '1px solid var(--line)', background: form.schedule_kind === 'dia_mes' ? 'var(--brass-bg, #F3ECD9)' : '#fff', color: form.schedule_kind === 'dia_mes' ? 'var(--brass)' : 'var(--ink-soft)' }}>Dia do mês</button>
            <button onClick={() => setForm({ ...form, schedule_kind: 'semanal' })} style={{ flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12.5, border: '1px solid var(--line)', background: form.schedule_kind === 'semanal' ? 'var(--brass-bg, #F3ECD9)' : '#fff', color: form.schedule_kind === 'semanal' ? 'var(--brass)' : 'var(--ink-soft)' }}>Toda semana</button>
          </div>

          {form.schedule_kind === 'dia_mes' ? (
            <label style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
              Dia do mês (se cair no fim de semana, vai pro próximo dia útil)
              <input style={{ ...inp, marginTop: 4 }} type="number" min="1" max="31" value={form.day_of_month} onChange={(e) => setForm({ ...form, day_of_month: e.target.value })} />
            </label>
          ) : (
            <label style={{ display: 'block', fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 12 }}>
              Dia da semana (gera uma ocorrência por semana no mês)
              <select style={{ ...inp, marginTop: 4 }} value={form.weekday} onChange={(e) => setForm({ ...form, weekday: e.target.value })}>
                {DIAS.map((d, i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </label>
          )}

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={form.is_variable} onChange={(e) => setForm({ ...form, is_variable: e.target.checked })} />
            Valor variável (pede conferência ao lançar no mês)
          </label>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={salvar} disabled={salvando || !form.name.trim()} style={{ flex: 1, padding: 11, borderRadius: 9, border: 0, cursor: 'pointer', background: 'var(--forest)', color: '#fff', fontSize: 14, fontWeight: 600 }}>{salvando ? 'Salvando…' : editId ? 'Salvar alterações' : 'Criar conta fixa'}</button>
            <button onClick={() => setForm(null)} style={{ padding: '11px 16px', borderRadius: 9, border: '1px solid var(--line)', background: '#fff', cursor: 'pointer', fontSize: 14, color: 'var(--ink-soft)' }}>Cancelar</button>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-h"><h2>Contas cadastradas</h2></div>
        <div>
          {bills.length === 0 && <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>Nenhuma conta fixa ainda.</div>}
          {bills.map((b) => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', borderBottom: '1px solid var(--line-soft)', opacity: b.active ? 1 : 0.5 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{b.category} · {agendaLabel(b)}{b.is_variable ? ' · valor variável' : ''}{!b.active && ' · inativa'}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--down)' }}>{fmt(b.amount)}</div>
              <button onClick={() => toggleAtivo(b)} title={b.active ? 'desativar' : 'ativar'} style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--ink-soft)' }}>{b.active ? '⏸' : '▶'}</button>
              <button onClick={() => abrirEdit(b)} style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--forest-2)' }}>editar</button>
              <button onClick={() => apagar(b)} style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--down)' }}>✕</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
