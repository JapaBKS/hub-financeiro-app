'use client';
import { useState } from 'react';
import FormCartao from './form-client';
import Recentes from './recentes-client';
import FaturasView from '../faturas/view-client';

export default function CartoesTabs({ cards, recentes, invoices, items, payments }) {
  const [aba, setAba] = useState('faturas'); // 'faturas' | 'lancar'

  const tab = (val, label) => (
    <button onClick={() => setAba(val)} style={{
      padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
      border: '1px solid ' + (aba === val ? 'var(--forest)' : 'var(--line)'),
      background: aba === val ? 'var(--forest)' : 'var(--surface)',
      color: aba === val ? '#fff' : 'var(--ink-soft)',
    }}>{label}</button>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {tab('faturas', 'Faturas')}
        {tab('lancar', '+ Lançar compra')}
      </div>

      {aba === 'faturas' ? (
        <FaturasView cards={cards} invoices={invoices} items={items} payments={payments} />
      ) : (
        <div style={{ maxWidth: 560 }}>
          <FormCartao cards={cards} />
          <Recentes purchases={recentes} cards={cards} />
        </div>
      )}
    </div>
  );
}
