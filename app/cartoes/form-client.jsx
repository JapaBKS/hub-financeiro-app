'use client';
import { useState } from 'react';

const CATEGORIAS = ['Comida', 'Mercado', 'Lazer', 'Transporte', 'Saúde', 'Casa', 'Assinaturas', 'Roupas', 'Educação', 'Presentes', 'Outros'];

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)',
  fontSize: 14, boxSizing: 'border-box', fontFamily: 'var(--font-body)', background: '#fff',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', margin: '14px 0 6px' };

export default function FormCartao({ cards }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7); // YYYY-MM

  const [cardId, setCardId] = useState(cards[0]?.id ? String(cards[0].id) : '');
  const [description, setDescription] = useState('');
  const [categoria, setCategoria] = useState('Outros');
  const [pagador, setPagador] = useState('eu');
  const [purchasedAt, setPurchasedAt] = useState(hoje);
  const [valorTotal, setValorTotal] = useState('');
  const [parcelas, setParcelas] = useState('1');
  const [mesInicio, setMesInicio] = useState(mesAtual);
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const nParc = Math.max(1, Number(parcelas) || 1);
  const valorParcela = (Number(valorTotal) || 0) / nParc;

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
        pagador,
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
    } else {
      setEstado('erro');
      setMsg(data.erro || 'Não foi possível salvar.');
    }
  }

  const fmt = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <form onSubmit={salvar} className="card" style={{ padding: '20px 22px' }}>
      <label style={labelStyle}>Cartão</label>
      <select style={inputStyle} value={cardId} onChange={(e) => setCardId(e.target.value)} required>
        {cards.map((c) => <option key={c.id} value={c.id}>{c.name} (vence dia {c.due_day})</option>)}
      </select>

      <label style={labelStyle}>Descrição</label>
      <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)}
        placeholder="Ex.: Geladeira nova" required />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Categoria</label>
          <select style={inputStyle} value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Quem paga</label>
          <select style={inputStyle} value={pagador} onChange={(e) => setPagador(e.target.value)}>
            <option value="eu">Eu</option>
            <option value="pai">Pai</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Data da compra</label>
          <input style={inputStyle} type="date" value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)} required />
        </div>
        <div>
          <label style={labelStyle}>1ª parcela no mês</label>
          <input style={inputStyle} type="month" value={mesInicio}
            onChange={(e) => setMesInicio(e.target.value)} required />
        </div>
      </div>

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
