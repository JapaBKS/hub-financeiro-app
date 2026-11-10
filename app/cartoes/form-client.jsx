'use client';
import { useState } from 'react';
import { CATEGORIAS } from '../../lib/dominio/categorias';
import { hojeISO } from '../../lib/dominio/datas';
import { mesDaFatura, dataFechamento, temFechamento } from '../../lib/dominio/fatura';


const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)',
  fontSize: 14, boxSizing: 'border-box', fontFamily: 'var(--font-body)', background: 'var(--surface)',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', margin: '14px 0 6px' };

// 1ª fatura sugerida pelo dia de fechamento do cartão (sem ele, pela regra antiga do vencimento)
const mesSugerido = (card, dataCompra) => mesDaFatura(card, dataCompra || hojeISO());

export default function FormCartao({ cards, defaultCardId, defaultMes, onSaved }) {
  const hoje = hojeISO();

  const [cardId, setCardId] = useState(defaultCardId != null ? String(defaultCardId) : (cards[0]?.id ? String(cards[0].id) : ''));
  const [description, setDescription] = useState('');
  const [categoria, setCategoria] = useState('Outros');
  const [pagador, setPagador] = useState('eu'); // 'eu' | 'pai' | 'dividido'
  const [paiPct, setPaiPct] = useState('50');
  const [purchasedAt, setPurchasedAt] = useState(hoje);
  const [valorTotal, setValorTotal] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const cartaoDe = (id) => cards.find((c) => String(c.id) === String(id));
  const [mesInicio, setMesInicio] = useState(defaultMes || mesSugerido(cartaoDe(cardId), hoje));
  // enquanto você não mexer no mês à mão, ele acompanha o cartão e a data da compra
  const [mesManual, setMesManual] = useState(Boolean(defaultMes));
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const nParc = Math.max(1, Number(parcelas) || 1);
  // parcela arredondada em centavos (o banco também arredonda)
  const valorParcela = Math.round(((Number(valorTotal) || 0) / nParc) * 100) / 100;
  const paiPctNum = pagador === 'eu' ? 0 : pagador === 'pai' ? 100 : Math.min(100, Math.max(0, Number(paiPct) || 0));

  async function salvar(e) {
    e.preventDefault();
    setEstado('enviando');
    setMsg('');
    const res = await fetch('/api/card-purchases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        card_id: cardId,
        description,
        categoria,
        pai_pct: paiPctNum,
        purchased_at: purchasedAt,
        installment_amount: valorParcela,
        installments_count: nParc,
        first_billed_month: mesInicio + '-01',
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setEstado('ok');
      setMsg(`"${description}" lançada em ${nParc}x!`);
      setDescription(''); setValorTotal(''); setParcelas('1');
      if (onSaved) onSaved();
    } else {
      setEstado('erro');
      setMsg(data.erro || 'Não foi possível salvar.');
    }
  }

  const fmt = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <form onSubmit={salvar} className="card" style={{ padding: '20px 22px' }}>
      <label style={labelStyle}>Cartão</label>
      <select style={inputStyle} value={cardId} onChange={(e) => { setCardId(e.target.value); if (!mesManual) setMesInicio(mesSugerido(cartaoDe(e.target.value), purchasedAt)); }} required>
        {cards.map((c) => <option key={c.id} value={c.id}>{c.name} (vence dia {c.due_day})</option>)}
      </select>

      <label style={labelStyle}>Descrição</label>
      <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="Ex.: Geladeira nova" required />

      <div className="grid2">
        <div>
          <label style={labelStyle}>Categoria</label>
          <select style={inputStyle} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Quem paga</label>
          <div style={{ display: 'flex', gap: 5 }}>
            {[['eu', 'Eu'], ['pai', 'Pai'], ['dividido', 'Dividido']].map(([v, l]) => (
              <button type="button" key={v} className="chip chip-grande" aria-pressed={pagador === v} onClick={() => setPagador(v)} style={{ flex: 1 }}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {pagador === 'dividido' && (
        <div style={{ marginTop: 10 }}>
          <label style={labelStyle}>Quanto o pai paga (%)</label>
          <input style={inputStyle} type="number" min="0" max="100" value={paiPct}
            onChange={(e) => setPaiPct(e.target.value)} placeholder="50" />
          {Number(valorTotal) > 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 6 }}>
              pai <b style={{ fontFamily: 'var(--font-display)' }}>{fmt(Number(valorTotal) * paiPctNum / 100)}</b>
              {' · '}você <b style={{ fontFamily: 'var(--font-display)' }}>{fmt(Number(valorTotal) * (100 - paiPctNum) / 100)}</b>
            </div>
          )}
        </div>
      )}

      <div className="grid2">
        <div>
          <label style={labelStyle}>Valor total (R$)</label>
          <input style={inputStyle} type="number" step="any" value={valorTotal}
            onChange={(e) => setValorTotal(e.target.value)} placeholder="0,00" required />
        </div>
        <div>
          <label style={labelStyle}>Parcelas</label>
          <input style={inputStyle} type="number" min="1" step="1" value={parcelas}
            onChange={(e) => setParcelas(e.target.value)} required />
        </div>
      </div>

      <div className="grid2">
        <div>
          <label style={labelStyle}>Data da compra</label>
          <input style={inputStyle} type="date" value={purchasedAt}
            onChange={(e) => { setPurchasedAt(e.target.value); if (!mesManual && e.target.value) setMesInicio(mesSugerido(cartaoDe(cardId), e.target.value)); }} required />
        </div>
        <div>
          <label style={labelStyle}>1ª parcela no mês</label>
          <input style={inputStyle} type="month" value={mesInicio}
            onChange={(e) => { setMesInicio(e.target.value); setMesManual(true); }} required />
        </div>
      </div>
      {(() => {
        // explica por que caiu nesse mês (ou avisa que falta o fechamento do cartão)
        const card = cartaoDe(cardId);
        if (!card) return null;
        const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const rot = (ym) => `${MESES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(2, 4)}`;
        const dm = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7);
        const sugerido = mesSugerido(card, purchasedAt);
        if (!temFechamento(card)) {
          return <div className="fc-dica fc-aviso">{card.name} sem dia de fechamento: cadastre em Meus cartões para a fatura certa cair sozinha.</div>;
        }
        const anterior = (() => { const [y, m] = sugerido.split('-').map(Number); return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`; })();
        const fechou = dataFechamento(card, anterior);
        const fecha = dataFechamento(card, sugerido);
        return (
          <div className="fc-dica">
            {purchasedAt >= fechou ? `A fatura de ${rot(anterior)} fechou ${dm(fechou)}; ` : ''}
            compra entra na fatura de <b>{rot(sugerido)}</b> (fecha {dm(fecha)}).
            {mesManual && mesInicio !== sugerido && (
              <button type="button" onClick={() => { setMesInicio(sugerido); setMesManual(false); }}>usar {rot(sugerido)}</button>
            )}
          </div>
        );
      })()}

      {Number(valorTotal) > 0 && (
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--ink-soft)' }}>
          {nParc}× de <b style={{ fontFamily: 'var(--font-display)' }}>{fmt(valorParcela)}</b>
          {' '}= <b style={{ fontFamily: 'var(--font-display)' }}>{fmt(Number(valorTotal))}</b>
        </div>
      )}

      <button type="submit" disabled={estado === 'enviando'} style={{
        width: '100%', marginTop: 18, padding: '12px', borderRadius: 9, border: 0, cursor: 'pointer',
        background: 'var(--forest)', color: '#fff', fontSize: 14, fontWeight: 600,
      }}>{estado === 'enviando' ? 'Salvando…' : 'Lançar compra'}</button>

      {msg && (
        <p style={{ marginTop: 12, fontSize: 13, fontWeight: 500,
          color: estado === 'ok' ? 'var(--up)' : 'var(--down)' }}>{msg}</p>
      )}
    </form>
  );
}
