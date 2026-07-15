'use client';
import { useState } from 'react';
import FormNegociacao from './form-client';

export default function RegistrarNegociacao({ assets, classes }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: aberto ? 12 : 0 }}>
        <button onClick={() => setAberto((v) => !v)} style={{
          padding: '9px 16px', borderRadius: 9, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
          border: '1px solid var(--forest)',
          background: aberto ? 'var(--surface)' : 'var(--forest)',
          color: aberto ? 'var(--forest-2)' : '#fff',
        }}>{aberto ? 'Fechar' : '+ registrar negociação'}</button>
      </div>
      {aberto && <FormNegociacao assets={assets} classes={classes} />}
    </div>
  );
}
