'use client';
import { useState, useEffect } from 'react';

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)',
  fontSize: 14, boxSizing: 'border-box', fontFamily: 'var(--font-body)', background: 'var(--surface)',
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', margin: '14px 0 6px' };

export default function FormNegociacao({ assets, classes, preset }) {
  const hoje = new Date().toISOString().slice(0, 10);
  const [ticker, setTicker] = useState('');
  const [novoTicker, setNovoTicker] = useState('');
  const [classId, setClassId] = useState('');
  const [side, setSide] = useState('compra');
  const [tradedAt, setTradedAt] = useState(hoje);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  // preenche automaticamente quando vem de uma recomendação clicada
  useEffect(() => {
    if (!preset) return;
    if (preset.ticker) setTicker(preset.ticker);
    if (preset.side) setSide(preset.side);
    if (preset.quantity != null && preset.quantity !== '') setQuantity(String(preset.quantity));
    if (preset.price != null && preset.price !== '') setPrice(String(preset.price));
    setEstado(null); setMsg('');
  }, [preset]);

  const ehNovo = ticker === '__novo__';
  const tickerFinal = ehNovo ? novoTicker : ticker;
  const total = (Number(quantity) || 0) * (Number(price) || 0);

  async function salvar(e) {
    e.preventDefault();
    setEstado('enviando');
    setMsg('');
    const res = await fetch('/api/trades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ticker: tickerFinal, classId: ehNovo ? classId : null,
        side, traded_at: tradedAt, quantity, price,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) {
      setEstado('ok');
      setMsg(`${side === 'compra' ? 'Compra' : 'Venda'} de ${tickerFinal.toUpperCase()} registrada!`);
      setTicker(''); setNovoTicker(''); setClassId(''); setQuantity(''); setPrice('');
      setTimeout(() => window.location.reload(), 800);
    } else {
      setEstado('erro');
      setMsg(data.erro || 'Não foi possível salvar.');
    }
  }

  return (
    <form onSubmit={salvar} className="card" style={{ padding: '20px 22px' }}>
      <label style={labelStyle}>Ativo</label>
      <select style={inputStyle} value={ticker} onChange={(e) => setTicker(e.target.value)} required>
        <option value="">— selecione —</option>
        <option value="__novo__">＋ Novo ativo</option>
        {assets.map((a) => <option key={a.ticker} value={a.ticker}>{a.ticker}</option>)}
      </select>

      {ehNovo && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label style={labelStyle}>Ticker novo</label>
            <input style={inputStyle} value={novoTicker} onChange={(e) => setNovoTicker(e.target.value)}
              placeholder="Ex.: ABCD3" required />
          </div>
          <div>
            <label style={labelStyle}>Classe</label>
            <select style={inputStyle} value={classId} onChange={(e) => setClassId(e.target.value)} required>
              <option value="">— classe —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      )}

      <label style={labelStyle}>Tipo</label>
      <div style={{ display: 'flex', gap: 8 }}>
        {['compra', 'venda'].map((s) => (
          <button type="button" key={s} onClick={() => setSide(s)} style={{
            flex: 1, padding: '10px', borderRadius: 9, cursor: 'pointer', fontSize: 14, fontWeight: 600,
            border: '1px solid ' + (side === s ? 'var(--forest)' : 'var(--line)'),
            background: side === s ? 'var(--forest)' : 'var(--surface)',
            color: side === s ? '#fff' : 'var(--ink-soft)',
          }}>{s === 'compra' ? 'Compra' : 'Venda'}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Quantidade</label>
          <input style={inputStyle} type="number" step="any" value={quantity}
            onChange={(e) => setQuantity(e.target.value)} placeholder="0" required />
        </div>
        <div>
          <label style={labelStyle}>Preço unitário (R$)</label>
          <input style={inputStyle} type="number" step="any" value={price}
            onChange={(e) => setPrice(e.target.value)} placeholder="0,00" required />
        </div>
      </div>

      <label style={labelStyle}>Data</label>
      <input style={inputStyle} type="date" value={tradedAt} onChange={(e) => setTradedAt(e.target.value)} required />

      {total > 0 && (
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--ink-soft)' }}>
          Total: <b style={{ fontFamily: 'var(--font-display)' }}>{total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
        </div>
      )}

      <button type="submit" disabled={estado === 'enviando'} style={{
        width: '100%', marginTop: 18, padding: '12px', borderRadius: 9, border: 0, cursor: 'pointer',
        background: 'var(--forest)', color: '#fff', fontSize: 14, fontWeight: 600,
      }}>{estado === 'enviando' ? 'Salvando…' : 'Registrar'}</button>

      {msg && (
        <p style={{ marginTop: 12, fontSize: 13, fontWeight: 500,
          color: estado === 'ok' ? 'var(--up)' : 'var(--down)' }}>{msg}</p>
      )}
    </form>
  );
}
