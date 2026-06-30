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

export default function FaturasView({ cards, invoices, items, payments = [] }) {
  const norm = (iso) => (iso || '').slice(0, 10);
  const mesHoje = mesAtualISO();

  const payKey = (cid, m) => `${cid}|${norm(m)}`;
  const [pagos, setPagos] = useState(() => {
    const o = {};
    payments.forEach((p) => { o[payKey(p.card_id, p.bill_month)] = norm(p.paid_at); });
    return o;
  });
  const pagoDe = (cid, m) => pagos[payKey(cid, m)];
  const fmtData = (iso) => norm(iso).split('-').reverse().join('/');

  async function confirmar(cid, m) {
    const res = await fetch('/api/invoice-payment', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: cid, bill_month: m }),
    });
    if (res.ok) { const d = await res.json(); setPagos((p) => ({ ...p, [payKey(cid, m)]: d.paid_at })); }
  }
  async function desfazer(cid, m) {
    const res = await fetch('/api/invoice-payment', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card_id: cid, bill_month: m }),
    });
    if (res.ok) setPagos((p) => { const n = { ...p }; delete n[payKey(cid, m)]; return n; });
  }

  // resumo: faturas vencidas/deste mês ainda não pagas
  const aPagar = invoices.filter((i) => norm(i.bill_month) <= mesHoje && !pagoDe(i.card_id, i.bill_month));
  const aPagarTotal = aPagar.reduce((s, i) => s + Number(i.total), 0);
  const aPagarSeu = aPagar.reduce((s, i) => s + Number(i.total_eu || i.total), 0);

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
      {aPagar.length > 0 && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: 14, borderLeft: '3px solid var(--amber)' }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber)', letterSpacing: '.02em' }}>A PAGAR (vencidas ou deste mês)</div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>
            {fmt(aPagarTotal)}
            {aPagarSeu !== aPagarTotal && (
              <span style={{ fontSize: 12.5, color: 'var(--ink-faint)', fontWeight: 500 }}> · seu {fmt(aPagarSeu)}</span>
            )}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>
            {aPagar.length} {aPagar.length === 1 ? 'fatura pendente' : 'faturas pendentes'} — confirme abaixo ao pagar
          </div>
        </div>
      )}

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
                  {pagoDe(cardId, m) && (
                    <div style={{ fontSize: 9, fontWeight: 700, marginTop: 1, color: ativo ? '#fff' : 'var(--up)' }}>✓ paga</div>
                  )}
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

            <div style={{ padding: '0 20px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              {pagoDe(cardId, mes) ? (
                <>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--up)', background: 'var(--up-bg)', borderRadius: 8, padding: '6px 12px' }}>
                    ✓ paga em {fmtData(pagoDe(cardId, mes))}
                  </span>
                  <button onClick={() => desfazer(cardId, mes)} style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 12.5, textDecoration: 'underline' }}>desfazer</button>
                </>
              ) : (
                <button onClick={() => confirmar(cardId, mes)} disabled={!faturaSel} style={{
                  padding: '10px 18px', borderRadius: 9, border: 0, cursor: 'pointer',
                  background: 'var(--forest)', color: '#fff', fontSize: 13.5, fontWeight: 600,
                }}>Confirmar pagamento</button>
              )}
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
