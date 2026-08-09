'use client';
import { useState } from 'react';

const inp = {
  width: 78, padding: '7px 9px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 14,
  fontFamily: 'var(--font-display)', boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--ink)', textAlign: 'right',
};
const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function MetasClasse({ classes }) {
  const [vals, setVals] = useState(() => {
    const o = {};
    classes.forEach((c) => { o[c.id] = (Number(c.target_pct) * 100).toFixed(1).replace(/\.0$/, ''); });
    return o;
  });
  const [fixos, setFixos] = useState(() => {
    const o = {};
    classes.forEach((c) => { o[c.id] = c.alvo_valor != null ? String(c.alvo_valor) : ''; });
    return o;
  });
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const ehFixo = (id) => String(fixos[id] || '').trim() !== '' && Number(fixos[id]) > 0;
  // só as classes SEM valor fixo disputam os 100%
  const total = classes.reduce((s, c) => s + (ehFixo(c.id) ? 0 : (Number(vals[c.id]) || 0)), 0);
  const cem = Math.abs(total - 100) < 0.05;

  async function salvar() {
    setEstado('enviando'); setMsg('');
    const targets = classes.map((c) => ({
      id: c.id,
      target_pct: ehFixo(c.id) ? 0 : (Number(vals[c.id]) || 0) / 100,
      alvo_valor: ehFixo(c.id) ? Number(fixos[c.id]) : null,
    }));
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

      <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '4px 20px 0' }}>
        Preencha <b>%</b> para classes que disputam a carteira, ou <b>valor fixo</b> (ex.: reserva de emergência).
        Quem tem valor fixo sai do rateio dos 100%.
      </p>

      <div style={{ marginTop: 8 }}>
        {classes.map((c) => {
          const fixo = ehFixo(c.id);
          return (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '9px 20px', borderBottom: '1px solid var(--line-soft)', flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1, minWidth: 90 }}>{c.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: fixo ? 0.4 : 1 }}>
                <input style={inp} type="number" step="any" min="0" value={vals[c.id]} disabled={fixo}
                  onChange={(e) => setVals((v) => ({ ...v, [c.id]: e.target.value }))} />
                <span style={{ fontSize: 13, color: 'var(--ink-faint)' }}>%</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>R$</span>
                <input style={{ ...inp, width: 96, borderColor: fixo ? 'var(--forest-2)' : 'var(--line)' }}
                  type="number" step="any" min="0" placeholder="fixo" value={fixos[c.id]}
                  onChange={(e) => setFixos((f) => ({ ...f, [c.id]: e.target.value }))} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '0 20px' }}>
        {!cem && (
          <p style={{ fontSize: 12, color: 'var(--amber)', marginTop: 10 }}>
            A soma das classes em % não fecha 100% — dá pra salvar assim, mas o ideal é fechar.
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
