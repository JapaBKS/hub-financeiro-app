'use client';
import { useState } from 'react';

const NOVA = '__nova__';

// Categoria como lista de verdade (<select>), com "+ nova categoria…" para digitar uma que
// ainda não existe. O antigo <input list> + <datalist> não abria a lista no iPhone.
export default function SeletorCategoria({ value, onChange, opcoes = [], className = 'campo', style, estiloInput }) {
  const existentes = [...new Set([...(opcoes || []), ...(value ? [value] : [])])].filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const [digitando, setDigitando] = useState(false);
  const ehNova = digitando;

  if (ehNova) {
    return (
      <div style={{ display: 'flex', gap: 6, ...style }}>
        <input className={className} style={{ flex: 1, minWidth: 0, ...estiloInput }} autoFocus placeholder="Nova categoria"
          value={value} onChange={(e) => onChange(e.target.value)} />
        <button type="button" onClick={() => { setDigitando(false); onChange(''); }} title="voltar para a lista"
          style={{ border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-soft)', borderRadius: 8, padding: '0 10px', cursor: 'pointer', fontSize: 13 }}>✕</button>
      </div>
    );
  }

  return (
    <select className={className} style={{ ...estiloInput, ...style }} value={value || ''}
      onChange={(e) => {
        if (e.target.value === NOVA) { setDigitando(true); onChange(''); } else onChange(e.target.value);
      }}>
      <option value="">Categoria</option>
      {existentes.map((c) => <option key={c} value={c}>{c}</option>)}
      <option value={NOVA}>+ nova categoria…</option>
    </select>
  );
}
