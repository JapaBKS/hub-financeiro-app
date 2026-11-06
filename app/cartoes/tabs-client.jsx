'use client';
import { useState } from 'react';
import FormCartao from './form-client';
import Recentes from './recentes-client';
import FaturasView from '../faturas/view-client';
import GerenciarCartoes from './gerenciar-cartoes-client';

export default function CartoesTabs({ cards, recentes, invoices, items, payments }) {
  const [aba, setAba] = useState('faturas'); // 'faturas' | 'lancar' | 'cartoes'

  const tab = (val, label) => (
    <button type="button" onClick={() => setAba(val)} aria-pressed={aba === val} style={{
      padding: '10px 6px', borderRadius: 9, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', minWidth: 0,
      border: '1px solid ' + (aba === val ? 'var(--forest)' : 'var(--line)'),
      background: aba === val ? 'var(--forest)' : 'var(--surface)',
      color: aba === val ? '#fff' : 'var(--ink-soft)',
    }}>{label}</button>
  );

  return (
    <div>
      <div className="cart-abas">
        {tab('faturas', 'Faturas')}
        {tab('lancar', '+ Lançar')}
        {tab('cartoes', 'Meus cartões')}
      </div>

      {/* as 3 abas ficam montadas (só escondidas): trocar de aba não desfaz pagamentos, edições e exclusões */}
      <div hidden={aba !== 'faturas'}>
        <FaturasView cards={cards} invoices={invoices} items={items} payments={payments} />
      </div>
      <div hidden={aba !== 'lancar'} style={{ maxWidth: 560 }}>
        <FormCartao cards={cards.filter((c) => c.ativo !== false)} onSaved={() => setTimeout(() => window.location.reload(), 900)} />
        <Recentes purchases={recentes} cards={cards} />
      </div>
      <div hidden={aba !== 'cartoes'}>
        <GerenciarCartoes cards={cards} />
      </div>
    </div>
  );
}
