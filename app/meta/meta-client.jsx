'use client';
import { useState } from 'react';

const inp = {
  width: '100%', padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)',
  fontSize: 14, boxSizing: 'border-box', fontFamily: 'var(--font-body)', background: 'var(--surface)',
};
const lab = { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', margin: '12px 0 6px' };

export default function MetaForm({ goal }) {
  const [target, setTarget] = useState(String(goal.target_value ?? ''));
  const [monthly, setMonthly] = useState(String(goal.monthly_contribution ?? ''));
  const [ret, setRet] = useState(String(((goal.assumed_annual_return ?? 0) * 100).toFixed(2)));
  const [started, setStarted] = useState((goal.started_at || '').slice(0, 10));
  const [startVal, setStartVal] = useState(String(goal.starting_value ?? ''));
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');
  const [snapMsg, setSnapMsg] = useState('');

  async function salvar(e) {
    e.preventDefault();
    setEstado('enviando'); setMsg('');
    const res = await fetch('/api/goal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_value: Number(target),
        monthly_contribution: Number(monthly),
        assumed_annual_return: Number(ret) / 100,
        started_at: started,
        starting_value: Number(startVal),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) { setEstado('ok'); setMsg('Meta salva! Recarregue para ver a nova projeção.'); }
    else { setEstado('erro'); setMsg(data.erro || 'Não foi possível salvar.'); }
  }

  async function salvarFoto() {
    setSnapMsg('salvando…');
    const res = await fetch('/api/snapshot', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setSnapMsg(res.ok && data.ok ? 'Foto do mês salva!' : (data.erro || 'Falhou.'));
  }

  return (
    <form onSubmit={salvar} className="card" style={{ padding: '20px 22px' }}>
      <div className="card-h" style={{ marginBottom: 4 }}><h2>Ajustar meta</h2></div>

      <div className="grid2">
        <div><label style={lab}>Valor-alvo (R$)</label><input style={inp} type="number" step="any" value={target} onChange={(e) => setTarget(e.target.value)} /></div>
        <div><label style={lab}>Aporte mensal (R$)</label><input style={inp} type="number" step="any" value={monthly} onChange={(e) => setMonthly(e.target.value)} /></div>
        <div><label style={lab}>Retorno anual (%)</label><input style={inp} type="number" step="any" value={ret} onChange={(e) => setRet(e.target.value)} /></div>
        <div><label style={lab}>Início</label><input style={inp} type="date" value={started} onChange={(e) => setStarted(e.target.value)} /></div>
        <div><label style={lab}>Valor inicial (R$)</label><input style={inp} type="number" step="any" value={startVal} onChange={(e) => setStartVal(e.target.value)} /></div>
      </div>

      <button type="submit" disabled={estado === 'enviando'} style={{
        width: '100%', marginTop: 18, padding: '12px', borderRadius: 9, border: 0, cursor: 'pointer',
        background: 'var(--forest)', color: '#fff', fontSize: 14, fontWeight: 600,
      }}>{estado === 'enviando' ? 'Salvando…' : 'Salvar meta'}</button>
      {msg && <p style={{ marginTop: 10, fontSize: 13, fontWeight: 500, color: estado === 'ok' ? 'var(--up)' : 'var(--down)' }}>{msg}</p>}

      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line-soft)' }}>
        <button type="button" onClick={salvarFoto} style={{
          padding: '9px 14px', borderRadius: 9, border: '1px solid var(--line)', cursor: 'pointer',
          background: 'var(--surface)', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600,
        }}>Salvar foto de hoje</button>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)', marginLeft: 10 }}>
          {snapMsg || 'grava o patrimônio do mês atual manualmente'}
        </span>
      </div>
    </form>
  );
}
