'use client';
import { useState } from 'react';

const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const CATEGORIAS = ['Comida', 'Mercado', 'Lazer', 'Transporte', 'Saúde', 'Casa', 'Assinaturas', 'Roupas', 'Educação', 'Presentes', 'Outros'];
const inpF = {
  padding: '7px 9px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13,
  fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: '#fff', width: '100%',
};
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

  // itens com estado (pra edição refletir na hora) + totais calculados a partir deles
  const [itensState, setItens] = useState(items);
  const totaisDe = (cid, m) => {
    const arr = itensState.filter((i) => i.card_id === cid && norm(i.bill_month) === norm(m));
    const total = arr.reduce((s, i) => s + Number(i.amount), 0);
    const pai = arr.reduce((s, i) => s + Number(i.amount_pai || 0), 0);
    return { total, pai, eu: total - pai };
  };

  // edição completa de um item da fatura
  const [editKey, setEditKey] = useState(null);
  const [editForm, setEditForm] = useState({});
  const itKey = (it) => `${it.purchase_id}|${it.parcela_idx}`;
  function abrirEdit(it) {
    setEditKey(itKey(it));
    setEditForm({
      description: it.description || '',
      categoria: it.categoria || 'Outros',
      pagador: it.pagador || 'eu',
      paiPct: it.pai_pct != null ? String(it.pai_pct) : '50',
      valor: Number(it.amount).toFixed(2),
      valorOrig: Number(it.amount).toFixed(2),
    });
  }
  async function salvarItem(it) {
    const f = editForm;
    const paiPct = f.pagador === 'eu' ? 0 : f.pagador === 'pai' ? 100 : Math.min(100, Math.max(0, Number(f.paiPct) || 0));
    const pagadorCalc = paiPct <= 0 ? 'eu' : paiPct >= 100 ? 'pai' : 'dividido';

    // campos da compra (afetam todos os meses)
    const r1 = await fetch('/api/card-purchases', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: it.purchase_id, description: f.description, categoria: f.categoria, pai_pct: paiPct }),
    });
    // valor só desta parcela (se mudou)
    let okVal = true;
    if (f.valor !== f.valorOrig) {
      const r2 = await fetch('/api/installment', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchase_id: it.purchase_id, n: it.parcela_idx, amount: Number(f.valor) }),
      });
      okVal = r2.ok;
    }
    if (r1.ok && okVal) {
      setItens((arr) => arr.map((x) => {
        if (x.purchase_id !== it.purchase_id) return x;
        const novoAmount = itKey(x) === itKey(it) ? Number(f.valor) : Number(x.amount);
        return {
          ...x, description: f.description, categoria: f.categoria, pagador: pagadorCalc, pai_pct: paiPct,
          amount: novoAmount, amount_pai: Math.round(novoAmount * paiPct) / 100,
        };
      }));
      setEditKey(null);
    }
  }
  async function apagarCompra(it) {
    if (!confirm('Apagar esta compra inteira? Some de todas as faturas (inclusive futuras).')) return;
    const res = await fetch('/api/card-purchases', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.purchase_id }),
    });
    if (res.ok) { setItens((arr) => arr.filter((x) => x.purchase_id !== it.purchase_id)); setEditKey(null); }
  }

  // resumo: faturas vencidas/deste mês ainda não pagas
  const aPagar = invoices.filter((i) => norm(i.bill_month) <= mesHoje && !pagoDe(i.card_id, i.bill_month));
  const aPagarTotal = aPagar.reduce((s, i) => s + totaisDe(i.card_id, i.bill_month).total, 0);
  const aPagarSeu = aPagar.reduce((s, i) => s + totaisDe(i.card_id, i.bill_month).eu, 0);

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
  const itensSel = itensState
    .filter((i) => i.card_id === cardId && norm(i.bill_month) === mes)
    .sort((a, b) => b.amount - a.amount);
  const tSel = totaisDe(cardId, mes);
  const totalFuturo = invoices
    .filter((i) => i.card_id === cardId && norm(i.bill_month) > mesHoje)
    .reduce((s, i) => s + totaisDe(i.card_id, i.bill_month).total, 0);

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
                    {fmt(totaisDe(cardId, m).total).replace('R$', '').trim()}
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
                  {fmt(tSel.total)}
                </div>
                {tSel.pai > 0 && (
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 4 }}>
                    seu <b style={{ color: 'var(--ink)' }}>{fmt(tSel.eu)}</b>
                    {' · '}pai <b style={{ color: 'var(--brass)' }}>{fmt(tSel.pai)}</b>
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
              {itensSel.map((it, i) => {
                const editando = editKey === itKey(it);
                if (editando) {
                  return (
                    <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--line-soft)', background: '#FAFBF9' }}>
                      <input style={{ ...inpF, marginBottom: 8 }} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Descrição" />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <select style={inpF} value={editForm.categoria} onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}>
                          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[['eu', 'Eu'], ['pai', 'Pai'], ['dividido', 'Div.']].map(([v, l]) => (
                            <button type="button" key={v} onClick={() => setEditForm({ ...editForm, pagador: v })} style={{
                              flex: 1, padding: '7px 2px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                              border: '1px solid ' + (editForm.pagador === v ? 'var(--forest)' : 'var(--line)'),
                              background: editForm.pagador === v ? 'var(--forest)' : '#fff', color: editForm.pagador === v ? '#fff' : 'var(--ink-soft)',
                            }}>{l}</button>
                          ))}
                        </div>
                        {editForm.pagador === 'dividido' && (
                          <input style={inpF} type="number" min="0" max="100" value={editForm.paiPct} onChange={(e) => setEditForm({ ...editForm, paiPct: e.target.value })} placeholder="% do pai" />
                        )}
                        <input style={inpF} type="number" step="any" value={editForm.valor} onChange={(e) => setEditForm({ ...editForm, valor: e.target.value })} placeholder="Valor desta parcela" />
                      </div>
                      <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 6 }}>
                        Descrição, categoria e quem paga valem pra compra toda · o valor é só desta parcela ({it.parcela})
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
                        <button onClick={() => salvarItem(it)} style={{ flex: 1, padding: '8px', borderRadius: 8, border: 0, cursor: 'pointer', background: 'var(--forest)', color: '#fff', fontSize: 13, fontWeight: 600 }}>Salvar</button>
                        <button onClick={() => setEditKey(null)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', background: '#fff', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600 }}>Cancelar</button>
                        <button onClick={() => apagarCompra(it)} title="apagar compra inteira" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', background: '#fff', color: 'var(--down)', fontSize: 13, fontWeight: 600 }}>Apagar</button>
                      </div>
                    </div>
                  );
                }
                return (
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
                    <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <b style={{ fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{fmt(it.amount)}</b>
                      <button onClick={() => abrirEdit(it)} title="editar este item" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 13, padding: 0 }}>✎</button>
                    </span>
                  </div>
                );
              })}
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
