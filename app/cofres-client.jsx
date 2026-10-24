'use client';
import { useState } from 'react';

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Cada cofre é um bloco com a MESMA estrutura (nome + variação / valor / alvo), numa grade
// de colunas iguais. Antes eram "etiquetas" soltas em linha, de larguras diferentes, que
// quebravam de linha de forma irregular — principalmente no celular.
export default function CofresClient({ cofres }) {
  const [editId, setEditId] = useState(null);
  const [valor, setValor] = useState('');
  const [busy, setBusy] = useState(false);

  async function salvar(id) {
    setBusy(true);
    await fetch('/api/classes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, alvo_valor: Number(String(valor).replace(',', '.')) }),
    });
    window.location.reload();
  }

  return (
    <section className="card" style={{ padding: '12px 14px 14px', marginBottom: 14 }}>
      <div className="eyebrow" style={{ marginBottom: 8 }}>Cofres</div>

      <div className="cofres-grade">
        {cofres.map((c) => {
          const sobra = c.valor - c.alvo;
          const pct = c.alvo > 0 ? (sobra / c.alvo) * 100 : 0;
          const acima = sobra >= 0;
          const editando = editId === c.id;

          return (
            <div key={c.nome} className="cofre">
              <div className="cofre-topo">
                <span className="cofre-nome">{c.nome}</span>
                <span className="cofre-pct" style={{
                  color: acima ? 'var(--up)' : 'var(--amber)',
                  background: acima ? 'var(--up-bg)' : 'var(--amber-bg)',
                }}>
                  {acima ? '+' : ''}{pct.toFixed(2).replace('.', ',')}%
                </span>
              </div>

              <b className="cofre-valor">{brl(c.valor)}</b>

              <div className="cofre-alvo">
                {editando ? (
                  <>
                    <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>alvo</span>
                    <input value={valor} onChange={(e) => setValor(e.target.value)} autoFocus
                      className="cofre-input" inputMode="decimal" />
                    <button onClick={() => salvar(c.id)} disabled={busy} style={btn({ background: 'var(--forest)', color: '#fff', border: 0 })}>ok</button>
                    <button onClick={() => setEditId(null)} style={btn()}>✕</button>
                  </>
                ) : (
                  <>
                    <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>alvo</span>
                    <button
                      onClick={() => { setEditId(c.id); setValor(String(c.alvo)); }}
                      title={`alvo ${brl(c.alvo)} · clique para editar`}
                      style={btn({ color: 'var(--ink-soft)' })}>
                      {brl(c.alvo)} ✎
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const btn = (extra = {}) => ({
  fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, cursor: 'pointer',
  border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-soft)', ...extra,
});
