'use client';
import { useState } from 'react';
import { apagarNegociacao, atualizarNegociacao } from './actions';
import { brl as fmt } from '../../lib/format';

const fmtData = (iso) => (iso || '').slice(0, 10).split('-').reverse().join('/');

export default function ListaNegociacoes({ trades }) {
  const [lista, setLista] = useState(trades);
  const [busy, setBusy] = useState(null);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [ano, setAno] = useState('todos');
  const [mes, setMes] = useState('todos');

  const anos = [...new Set(lista.map((t) => (t.traded_at || '').slice(0, 4)).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const filtradas = lista.filter((t) => {
    if (tipo !== 'todos' && t.side !== tipo) return false;
    if (busca && !t.ticker.includes(busca.toUpperCase())) return false;
    const d = (t.traded_at || '').slice(0, 10);
    if (ano !== 'todos' && d.slice(0, 4) !== ano) return false;
    if (mes !== 'todos' && d.slice(5, 7) !== mes) return false;
    return true;
  });

  const totC = filtradas.filter((t) => t.side === 'compra').reduce((s, t) => s + Number(t.quantity) * Number(t.price), 0);
  const totV = filtradas.filter((t) => t.side === 'venda').reduce((s, t) => s + Number(t.quantity) * Number(t.price), 0);
  const temFiltro = tipo !== 'todos' || busca || ano !== 'todos' || mes !== 'todos';

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
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <input className="campo" style={{ flex: 1, minWidth: 150 }} value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar ticker (ex.: PETR4)" />
        <select className="campo" style={{ width: 120 }} value={tipo} onChange={(e) => setTipo(e.target.value)}>
          <option value="todos">Todas</option>
          <option value="compra">Compras</option>
          <option value="venda">Vendas</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <select className="campo" style={{ width: 110 }} value={ano} onChange={(e) => setAno(e.target.value)}>
          <option value="todos">Todo ano</option>
          {anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="campo" style={{ width: 130 }} value={mes} onChange={(e) => setMes(e.target.value)}>
          <option value="todos">Todo mês</option>
          {MESES.map((nome, i) => (
            <option key={nome} value={String(i + 1).padStart(2, '0')}>{nome}</option>
          ))}
        </select>
        {temFiltro && (
          <button onClick={() => { setBusca(''); setTipo('todos'); setAno('todos'); setMes('todos'); }} style={{
            padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
            border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-faint)',
          }}>limpar filtros</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8 }}>
        <span>{filtradas.length} {filtradas.length === 1 ? 'negociação' : 'negociações'}</span>
        {totC > 0 && <span>compras <b style={{ fontFamily: 'var(--font-display)', color: 'var(--down)' }}>{fmt(totC)}</b></span>}
        {totV > 0 && <span>vendas <b style={{ fontFamily: 'var(--font-display)', color: 'var(--up)' }}>{fmt(totV)}</b></span>}
      </div>

      <section className="card">
        {filtradas.map((t) => {
          if (editId === t.id) {
            return (
              <div key={t.id} style={{ padding: '12px 18px', borderBottom: '1px solid var(--line-soft)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 8 }}>{t.ticker}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <input className="campo" type="date" value={form.traded_at} onChange={(e) => setForm({ ...form, traded_at: e.target.value })} />
                  <select className="campo" value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value })}>
                    <option value="compra">Compra</option>
                    <option value="venda">Venda</option>
                  </select>
                  <input className="campo" type="number" step="any" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Qtd" />
                  <input className="campo" type="number" step="any" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Preço" />
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
                  {t.saldo != null && (
                    <>
                      {' · '}
                      <span
                        title="quantidade do ativo depois desta negociação (já com desdobramentos)"
                        style={{
                          fontWeight: 600,
                          color: t.saldo < 0 ? 'var(--down)' : 'var(--ink-soft)',
                        }}>
                        saldo {Number(t.saldo).toLocaleString('pt-BR', { maximumFractionDigits: 6 })}
                        {t.saldo < 0 ? ' ⚠' : ''}
                      </span>
                    </>
                  )}
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
