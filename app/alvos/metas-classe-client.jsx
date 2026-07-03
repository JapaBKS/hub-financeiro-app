'use client';
import { useState } from 'react';

const inp = {
  width: 78, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 14,
  fontFamily: 'var(--font-display)', boxSizing: 'border-box', background: 'var(--surface)', textAlign: 'right',
};

export default function MetasClasse({ classes }) {
  const [vals, setVals] = useState(() => {
    const o = {};
    classes.forEach((c) => { o[c.id] = (Number(c.target_pct) * 100).toFixed(1).replace(/\.0$/, ''); });
    return o;
  });
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const total = classes.reduce((s, c) => s + (Number(vals[c.id]) || 0), 0);
  const cem = Math.abs(total - 100) < 0.05;

  async function salvar() {
    setEstado('enviando'); setMsg('');
    const targets = classes.map((c) => ({ id: c.id, target_pct: (Number(vals[c.id]) || 0) / 100 }));
    const res = await fetch('/api/class-targets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targets }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) { setEstado('ok'); setMsg('Metas salvas! Recarregue para ver nas recomendações.'); }
    else { setEstado('erro'); setMsg(data.erro || 'Não foi possível salvar.'); }
  }

  return (
    <section className="card" style={{ marginBottom: 16, padding: '4px 0 16px' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Metas por classe</h2>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: cem ? 'var(--up)' : 'var(--amber)' }}>
          soma {total.toFixed(1).replace(/\.0$/, '')}%
        </span>
      </div>

      <div style={{ marginTop: 6 }}>
        {classes.map((c) => (
          <div key={c.id} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '9px 20px', borderBottom: '1px solid var(--line-soft)',
          }}>
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{c.name}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input style={inp} type="number" step="any" min="0" value={vals[c.id]}
                onChange={(e) => setVals((v) => ({ ...v, [c.id]: e.target.value }))} />
              <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>%</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '0 20px' }}>
        {!cem && (
          <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 10 }}>
            A soma não está em 100% — dá pra salvar assim, mas o ideal é fechar em 100%.
          </p>
        )}
        <button onClick={salvar} disabled={estado === 'enviando'} style={{
          width: '100%', marginTop: 12, padding: '11px', borderRadius: 9, border: 0, cursor: 'pointer',
          background: 'var(--forest)', color: '#fff', fontSize: 14, fontWeight: 600,
        }}>{estado === 'enviando' ? 'Salvando…' : 'Salvar metas por classe'}</button>
        {msg && <p style={{ marginTop: 10, fontSize: 13, fontWeight: 500, color: estado === 'ok' ? 'var(--up)' : 'var(--down)' }}>{msg}</p>}
      </div>
    </section>
  );
}
