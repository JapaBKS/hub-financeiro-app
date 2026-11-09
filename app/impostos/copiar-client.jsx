'use client';
import { useState } from 'react';

// Copia o texto da discriminação para colar no programa da Receita.
export default function Copiar({ texto }) {
  const [ok, setOk] = useState(false);
  async function copiar() {
    try { await navigator.clipboard.writeText(texto); setOk(true); setTimeout(() => setOk(false), 1600); } catch {}
  }
  return (
    <button type="button" className="chip" onClick={copiar} style={{ minHeight: 30, flex: 'none' }}>
      {ok ? 'Copiado' : 'Copiar'}
    </button>
  );
}
