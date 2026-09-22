'use client';

import { useState, useEffect } from 'react';
import { hojeISO } from '../../lib/dominio/datas';
import { criarNegociacao } from './actions';

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)',
  fontSize: 14, boxSizing: 'border-box', fontFamily: 'var(--font-body)', background: 'var(--surface)',
  color: 'var(--ink)'
};
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', margin: '14px 0 6px' };

export default function FormNegociacao({ assets, classes, preset }) {
  const hoje = hojeISO();
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
    
    // Chamada direta à Server Action
    const res = await criarNegociacao({
      ticker: tickerFinal,
      ehNovo,
      classId,
      side,
      traded_at: tradedAt,
      quantity,
      price
    });

    if (res.ok) {
      setEstado('ok');
      setMsg(`\({side === 'compra' ? 'Compra' : 'Venda'} de\){tickerFinal.toUpperCase()} registada!`);
      setTicker(''); setNovoTicker(''); setClassId(''); setQuantity(''); setPrice('');
    } else {
      setEstado('erro');
      setMsg(res.erro || 'Não foi possível salvar.');
    }
  }

  return (
