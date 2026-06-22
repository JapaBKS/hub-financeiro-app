'use client';
import { useState } from 'react';

const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function rotuloMes(iso) {
  const [a, m] = iso.split('-');
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
}
function mesAtualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function FaturasView({ cards, invoices, items }) {
  const norm = (iso) => (iso || '').slice(0, 10);
  const mesHoje = mesAtualISO();

  function mesesDoCartao(cardId) {
    return invoices
      .filter((i) => i.card_id === cardId)
      .map((i) => norm(i.bill_month))
      .sort();
  }
  function mesPadrao(cardId) {
    const meses = mesesDoCartao(cardId);
    if (meses.includes(mesHoje)) return mesHoje;
    return meses.find((m) => m >= mesHoje) || meses[meses.length - 1] || mesHoje;
  }

  const [cardId, setCardId] = useState(cards[0]?.id ?? null);
  const [mes, setMes] = useState(cards[0]?.id ? mesPadrao(cards[0].id) : mesHoje);

  function trocarCartao(id) {
    setCardId(id);
    setMes(mesPadrao(id));
  }

  const cartao = cards.find((c) => c.id === cardId);
  const meses = mesesDoCartao(cardId);
  const faturaSel = invoices.find((i) => i.card_id === cardId && norm(i.bill_month) === mes);
  const itensSel = items
    .filter((i) => i.card_id === cardId && norm(i.bill_month) === mes)
    .sort((a, b) => b.amount - a.amount);
  const totalFuturo = invoices
    .filter((i) => i.card_id === cardId && norm(i.bill_month) > mesHoje)
    .reduce((s, i) => s + Number(i.total), 0);

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {cards.map((c) => (
          <button key={c.id} onClick={() => trocarCartao(c.id)} style={{
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: '1px solid ' + (c.id === cardId ? 'var(--forest)' : 'var(--line)'),
            background: c.id === cardId ? 'var(--forest)' : '#fff',
            color: c.id === cardId ? '#fff' : 'var(--ink-soft)',
          }}>{c.name}</button>
        ))}
