'use client';
import { useState } from 'react';

// Mostra só as linhas mais recentes; as marcadas com .linha-antiga aparecem no "ver tudo".
export default function Expandir({ antigas, children }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className={`expandir${aberto ? ' aberto' : ''}`}>
      {children}
      {antigas > 0 && (
        <button type="button" className="expandir-btn" onClick={() => setAberto((v) => !v)}>
          {aberto ? 'mostrar só os últimos 12 meses' : `ver os ${antigas} meses anteriores`}
        </button>
      )}
    </div>
  );
}
