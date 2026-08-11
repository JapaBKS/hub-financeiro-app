'use client';
import { useState } from 'react';

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

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
    <section className="card" style={{ padding: '9px 14px', marginBottom: 14 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--ink-faint)', letterSpacing: '.04em', textTransform: 'uppercase' }}>
          Cofres
        </span>

        {cofres.map((c) => {
          const sobra = c.valor - c.alvo;
          const pct = c.alvo > 0 ? (sobra / c.alvo) * 100 : 0;
          const acima = sobra >= 0;
          const editando = editId === c.id;

          return (
            <span key={c.nome} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
              <span style={{ color: 'var(--ink-faint)' }}>{c.nome}</span>
              <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>{brl(c.valor)}</b>

              {editando ? (
                <>
                  <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>alvo</span>
                  <input value={valor} onChange={(e) => setValor(e.target.value)} autoFocus
                    style={{
                      width: 72, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--forest-2)',
                      fontSize: 11.5, textAlign: 'right', background: 'var(--surface)', color: 'var(--ink)',
                    }} />
                  <button onClick={() => salvar(c.id)} disabled={busy} style={btn({ background: 'var(--forest)', color: '#fff', border: 0 })}>ok</button>
                  <button onClick={() => setEditId(null)} style={btn()}>✕</button>
                </>
              ) : (
                <>
                  <span style={{
                    fontSize: 10.5, fontWeight: 700, borderRadius: 999, padding: '1px 7px',
                    color: acima ? 'var(--up)' : 'var(--amber)',
                    background: acima ? 'var(--up-bg)' : 'var(--amber-bg)',
                  }}>
                    {acima ? '+' : ''}{pct.toFixed(2).replace('.', ',')}%
                  </span>
                  <button
                    onClick={() => { setEditId(c.id); setValor(String(c.alvo)); }}
                    title={`alvo ${brl(c.alvo)} · clique para editar`}
                    style={btn({ color: 'var(--ink-faint)' })}>
                    {brl(c.alvo)} ✎
                  </button>
                </>
              )}
            </span>
          );
        })}
      </div>
    </section>
  );
}

const btn = (extra = {}) => ({
  fontSize: 10.5, fontWeight: 600, padding: '2px 7px', borderRadius: 6, cursor: 'pointer',
  border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-soft)', ...extra,
});
