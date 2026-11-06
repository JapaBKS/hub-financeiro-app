'use client';
import { useState } from 'react';

// As duas importações da B3 ficam guardadas atrás de um botão: são usadas de vez
// em quando e ocupavam o topo da tela inteira.
export default function ImportarPainel({ children }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <button type="button" className="chip chip-grande" aria-expanded={aberto} aria-pressed={aberto}
        onClick={() => setAberto((a) => !a)} style={{ width: '100%' }}>
        {aberto ? 'Fechar importação' : 'Importar da B3'}
      </button>
      {aberto && <div style={{ marginTop: 12 }}>{children}</div>}
    </div>
  );
}
