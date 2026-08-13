'use client';
import { useState } from 'react';
import FormCartao from '../cartoes/form-client';

const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const CATEGORIAS = ['Comida', 'Mercado', 'Lazer', 'Transporte', 'Saúde', 'Casa', 'Assinaturas', 'Roupas', 'Educação', 'Presentes', 'Outros'];
const inpF = {
  padding: '7px 9px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13,
  fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: 'var(--surface)', width: '100%',
};

const CORES = ['#2E5E4E', '#B98A3C', '#6FA287', '#C9A24B', '#3E7C63', '#8C6BB1', '#D98C5F', '#5B8DB8', '#A8B545', '#9C5A5A', '#7A7A7A'];

function arcPath(a0, a1, cx, cy, R, r) {
  const p = (ang, rad) => [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R);
  const [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
}
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
function rotuloMes(iso) {
  const [a, m] = iso.split('-');
  return `${MESES[Number(m) - 1]}/${a.slice(2)}`;
}
function mesAtualISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function mesAlvoISO() {
  const d = new Date();
  let y = d.getFullYear();
  let m = d.getMonth(); // 0-based
  if (d.getDate() >= 25) { m += 1; if (m > 11) { m = 0; y += 1; } }
  return `${y}-${String(m + 1).padStart(2, '0')}-01`;
}

export default function FaturasView({ cards, invoices, items, payments = [] }) {
  const norm = (iso) => (iso || '').slice(0, 10);
  const mesHoje = mesAtualISO();
  const mesAlvo = mesAlvoISO();

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
    if (res.ok) {
      const d = await res.json();
      setPagos((p) => ({ ...p, [payKey(cid, m)]: d.paid_at }));
      // se estava vendo a fatura que acabou de pagar, avança pra próxima do cartão
      if (cid === cardId && norm(m) === norm(mes)) {
        const ms = mesesDoCartao(cid);
        const prox = ms[ms.indexOf(norm(m)) + 1];
        if (prox) setMes(prox);
      }
    }
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
    // primeira fatura ainda não paga (a que você precisa resolver)
    const naoPaga = meses.find((m) => !pagoDe(cardId, m));
    if (naoPaga) return naoPaga;
    // todas pagas: mostra a mais recente
    return meses[meses.length - 1] || mesAlvo;
  }

  const [cardId, setCardId] = useState(cards[0]?.id ?? null);
  const [mes, setMes] = useState(cards[0]?.id ? mesPadrao(cards[0].id) : mesHoje);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [verPagas, setVerPagas] = useState(false);

  function trocarCartao(id) {
    setCardId(id);
    setMes(mesPadrao(id));
  }

  const cartao = cards.find((c) => c.id === cardId);
  const meses = mesesDoCartao(cardId);
  const pagasEscondidas = meses.filter((m) => pagoDe(cardId, m) && m !== mes);
  const mesesVisiveis = verPagas ? meses : meses.filter((m) => !pagoDe(cardId, m) || m === mes);
  const faturaSel = invoices.find((i) => i.card_id === cardId && norm(i.bill_month) === mes);
  const itensSel = itensState
    .filter((i) => i.card_id === cardId && norm(i.bill_month) === mes)
    .sort((a, b) => b.amount - a.amount);
  const tSel = totaisDe(cardId, mes);
  const totalFuturo = invoices
    .filter((i) => i.card_id === cardId && norm(i.bill_month) > mesHoje)
    .reduce((s, i) => s + totaisDe(i.card_id, i.bill_month).total, 0);

  // gastos por categoria do mês selecionado (todos os cartões, só a sua parte)
  const gastosCategoria = (() => {
    const arr = itensState.filter((i) => norm(i.bill_month) === mes);
    const map = {};
    arr.forEach((i) => {
      const cat = i.categoria || 'Sem categoria';
      const seu = Number(i.amount) - Number(i.amount_pai || 0);
      map[cat] = (map[cat] || 0) + seu;
    });
    // só entra no gráfico quem tem valor: categoria zerada (ex.: compra 100% do
    // pai, onde a sua parte é zero) poluía a legenda com 0%
    return Object.entries(map)
      .map(([cat, val]) => ({ cat, val }))
      .filter((c) => c.val > 0.005)
      .sort((a, b) => b.val - a.val);
  })();
  const gastoMesSeu = gastosCategoria.reduce((s, c) => s + c.val, 0);

  const fatias = (() => {
    let ang = -Math.PI / 2;
    return gastosCategoria.map((g, idx) => {
      const frac = gastoMesSeu > 0 ? g.val / gastoMesSeu : 0;
      const a0 = ang;
      const a1 = ang + frac * 2 * Math.PI;
      ang = a1;
      return { ...g, frac, color: CORES[idx % CORES.length], a0, a1 };
    });
  })();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setMostrarForm((v) => !v)} style={{
          padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          border: '1px solid var(--forest)', background: mostrarForm ? 'var(--surface)' : 'var(--forest)',
          color: mostrarForm ? 'var(--forest-2)' : '#fff',
        }}>{mostrarForm ? 'Fechar' : '+ lançar compra'}</button>
      </div>

      {mostrarForm && (
        <div style={{ marginBottom: 16 }}>
          <FormCartao cards={cards} defaultCardId={cardId} defaultMes={mes.slice(0, 7)} onSaved={() => setTimeout(() => window.location.reload(), 700)} />
        </div>
      )}

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
            background: c.id === cardId ? 'var(--forest)' : 'var(--surface)',
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
            {mesesVisiveis.map((m) => {
              const ativo = m === mes;
              return (
                <button key={m} onClick={() => setMes(m)} style={{
                  flex: 'none', padding: '8px 12px', borderRadius: 9, cursor: 'pointer', textAlign: 'center',
                  border: '1px solid ' + (ativo ? 'var(--forest)' : 'var(--line)'),
                  background: ativo ? 'var(--forest)' : 'var(--surface)', color: ativo ? '#fff' : 'var(--ink-soft)',
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
            {pagasEscondidas.length > 0 && (
              <button onClick={() => setVerPagas((v) => !v)} title="mostrar/ocultar faturas pagas" style={{
                flex: 'none', padding: '8px 12px', borderRadius: 9, cursor: 'pointer', minWidth: 76,
                border: '1px dashed var(--line)', background: 'transparent', color: 'var(--ink-faint)', fontSize: 11, fontWeight: 600,
              }}>{verPagas ? 'ocultar pagas' : `✓ pagas (${pagasEscondidas.length})`}</button>
            )}
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
                    <div key={i} style={{ padding: '12px 20px', borderBottom: '1px solid var(--line-soft)', background: 'var(--surface-2)' }}>
                      <input style={{ ...inpF, marginBottom: 8 }} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Descrição" />
                      <div className="grid2">
                        <select style={inpF} value={editForm.categoria} onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}>
                          {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {[['eu', 'Eu'], ['pai', 'Pai'], ['dividido', 'Div.']].map(([v, l]) => (
                            <button type="button" key={v} onClick={() => setEditForm({ ...editForm, pagador: v })} style={{
                              flex: 1, padding: '7px 2px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                              border: '1px solid ' + (editForm.pagador === v ? 'var(--forest)' : 'var(--line)'),
                              background: editForm.pagador === v ? 'var(--forest)' : 'var(--surface)', color: editForm.pagador === v ? '#fff' : 'var(--ink-soft)',
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
                        <button onClick={() => setEditKey(null)} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600 }}>Cancelar</button>
                        <button onClick={() => apagarCompra(it)} title="apagar compra inteira" style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', background: 'var(--surface)', color: 'var(--down)', fontSize: 13, fontWeight: 600 }}>Apagar</button>
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

          {gastosCategoria.length > 0 && (
            <section className="card" style={{ marginTop: 16 }}>
              <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <h2>Gastos por categoria</h2>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)', textTransform: 'capitalize' }}>{rotuloMes(mes)} · todos os cartões</span>
              </div>
              <div style={{ padding: '6px 20px 4px', fontSize: 12, color: 'var(--ink-faint)' }}>
                sua parte no mês: <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>{fmt(gastoMesSeu)}</b>
              </div>
              <div style={{ padding: '10px 20px 18px', display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                <svg viewBox="0 0 150 150" width="150" height="150" style={{ flex: 'none' }}>
                  {fatias.length === 1 ? (
                    <circle cx="75" cy="75" r="56" fill="none" stroke={fatias[0].color} strokeWidth="28" />
                  ) : (
                    fatias.map((s) => <path key={s.cat} d={arcPath(s.a0, s.a1, 75, 75, 70, 42)} fill={s.color} />)
                  )}
                  <text x="75" y="71" textAnchor="middle" fontSize="9" fill="var(--ink-faint)">sua parte</text>
                  <text x="75" y="86" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--ink)" style={{ fontFamily: 'var(--font-display)' }}>{fmt(gastoMesSeu)}</text>
                </svg>
                <div style={{ flex: 1, minWidth: 180 }}>
                  {fatias.map((g) => (
                    <div key={g.cat} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                      <span style={{ width: 11, height: 11, borderRadius: 3, background: g.color, flex: 'none' }} />
                      <span style={{ color: 'var(--ink-soft)' }}>{g.cat}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(g.val)}
                        <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}> · {Math.round(g.frac * 100)}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
