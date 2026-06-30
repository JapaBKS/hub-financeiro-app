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
      {/* abas de cartão */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {cards.map((c) => (
          <button key={c.id} onClick={() => trocarCartao(c.id)} style={{
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: '1px solid ' + (c.id === cardId ? 'var(--forest)' : 'var(--line)'),
            background: c.id === cardId ? 'var(--forest)' : '#fff',
            color: c.id === cardId ? '#fff' : 'var(--ink-soft)',
          }}>{c.name}</button>
        ))}
      </div>

      {meses.length === 0 && (
        <div className="card" style={{ padding: '20px', fontSize: 13, color: 'var(--ink-faint)' }}>
          Nenhum lançamento neste cartão ainda.
        </div>
      )}

      {meses.length > 0 && (
        <>
          {/* faixa de meses */}
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6, marginBottom: 14 }}>
            {meses.map((m) => {
              const inv = invoices.find((i) => i.card_id === cardId && norm(i.bill_month) === m);
              const ativo = m === mes;
              return (
                <button key={m} onClick={() => setMes(m)} style={{
                  flex: 'none', padding: '8px 12px', borderRadius: 9, cursor: 'pointer', textAlign: 'center',
                  border: '1px solid ' + (ativo ? 'var(--forest)' : 'var(--line)'),
                  background: ativo ? 'var(--forest)' : '#fff', color: ativo ? '#fff' : 'var(--ink-soft)',
                  minWidth: 76,
                }}>
                  <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'capitalize' }}>{rotuloMes(m)}</div>
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, marginTop: 2 }}>
                    {fmt(inv?.total || 0).replace('R$', '').trim()}
                  </div>
                </button>
              );
            })}
          </div>

          {/* fatura selecionada */}
          <section className="card">
            <div style={{ padding: '18px 20px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <div className="eyebrow">{cartao?.name} · vence dia {cartao?.due_day}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 28, letterSpacing: '-.02em', marginTop: 4 }}>
                  {fmt(faturaSel?.total || 0)}
                </div>
                {Number(faturaSel?.total_pai) > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 4 }}>
                    seu <b style={{ color: 'var(--ink)' }}>{fmt(faturaSel?.total_eu || 0)}</b>
                    {' · '}pai <b style={{ color: 'var(--brass)' }}>{fmt(faturaSel?.total_pai || 0)}</b>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', textAlign: 'right' }}>
                comprometido à frente<br />
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--ink)' }}>{fmt(totalFuturo)}</b>
              </div>
            </div>

            <div style={{ borderTop: '1px solid var(--line-soft)' }}>
              {itensSel.map((it, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px',
                  borderBottom: '1px solid var(--line-soft)', fontSize: 13.5,
                }}>
                  <span style={{ fontWeight: 500 }}>{it.description}</span>
                  {it.purchased_at && (
                    <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{(it.purchased_at || '').slice(0, 10).split('-').reverse().join('/')}</span>
                  )}
                  {it.categoria && (
                    <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{it.categoria}</span>
                  )}
                  {it.parcela && !it.parcela.startsWith('1/1') && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: 'var(--forest-2)', background: 'var(--up-bg)',
                      borderRadius: 5, padding: '1px 6px',
                    }}>{it.parcela}</span>
                  )}
                  {it.pagador === 'pai' && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: 'var(--brass)', background: 'var(--brass-bg, #F3ECD9)', borderRadius: 4, padding: '1px 6px' }}>PAI</span>
                  )}
                  {it.pagador === 'dividido' && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: 'var(--brass)', background: 'var(--brass-bg, #F3ECD9)', borderRadius: 4, padding: '1px 6px' }} title={`pai paga ${fmt(it.amount_pai || 0)}`}>PAI {Math.round(Number(it.pai_pct))}%</span>
                  )}
                  <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(it.amount)}
                  </b>
                </div>
              ))}
              {itensSel.length === 0 && (
                <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>Sem itens neste mês.</div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
