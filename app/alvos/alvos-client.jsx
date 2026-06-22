'use client';
import { useState } from 'react';

const inp = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 14,
  fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: '#fff',
};

export default function AlvosClient({ grupos: gruposIniciais }) {
  const [grupos, setGrupos] = useState(gruposIniciais);
  const [aba, setAba] = useState(0);
  const [novoTicker, setNovoTicker] = useState('');
  const [novoPct, setNovoPct] = useState('');
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const g = grupos[aba];
  if (!g) return <div className="card" style={{ padding: 20 }}>Nenhum grupo configurado.</div>;

  const soma = g.itens.reduce((s, it) => s + (Number(it.pct) || 0), 0);
  const fecha = Math.abs(soma - 100) < 0.05;

  function setItens(novos) {
    setGrupos((gs) => gs.map((x, i) => (i === aba ? { ...x, itens: novos } : x)));
    setMsg('');
  }
  function mudarPct(idx, val) {
    setItens(g.itens.map((it, i) => (i === idx ? { ...it, pct: val } : it)));
  }
  function remover(idx) {
    setItens(g.itens.filter((_, i) => i !== idx));
  }
  function adicionar() {
    const tk = novoTicker.trim().toUpperCase();
    if (!tk) return;
    if (g.itens.some((it) => it.ticker === tk)) { setMsg(`${tk} já está na lista.`); return; }
    setItens([...g.itens, { ticker: tk, pct: Number(novoPct) || 0 }]);
    setNovoTicker(''); setNovoPct('');
  }

  async function salvar() {
    setEstado('enviando'); setMsg('');
    const res = await fetch('/api/targets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: g.class_id,
        itens: g.itens.map((it) => ({ ticker: it.ticker, pct: (Number(it.pct) || 0) / 100 })),
      }),
    });
    if (res.ok) { setEstado('ok'); setMsg('Salvo!'); }
    else { setEstado('erro'); setMsg('Erro ao salvar.'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {grupos.map((x, i) => (
          <button key={x.class_id} onClick={() => { setAba(i); setMsg(''); }} style={{
            padding: '8px 16px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: '1px solid ' + (i === aba ? 'var(--forest)' : 'var(--line)'),
            background: i === aba ? 'var(--forest)' : '#fff', color: i === aba ? '#fff' : 'var(--ink-soft)',
          }}>{x.name}</button>
        ))}
      </div>

      <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 10 }}>
        Este grupo é <b style={{ color: 'var(--ink)' }}>{(g.groupTarget * 100).toFixed(0)}%</b> da carteira.
        Os pesos abaixo somam 100% entre os ativos do grupo.
      </div>

      <section className="card" style={{ marginBottom: 12 }}>
        {g.itens.map((it, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line-soft)' }}>
            <b style={{ fontFamily: 'var(--font-display)', flex: 1 }}>{it.ticker}</b>
            <input style={{ ...inp, width: 90, textAlign: 'right' }} type="number" step="any" value={it.pct}
              onChange={(e) => mudarPct(idx, e.target.value)} />
            <span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>%</span>
            <button onClick={() => remover(idx)} title="Remover" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18, padding: '0 2px' }}>×</button>
          </div>
        ))}
        {g.itens.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--ink-faint)' }}>Nenhum ativo neste grupo. Adicione abaixo.</div>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#FAFBF9' }}>
          <input style={{ ...inp, flex: 1 }} value={novoTicker} onChange={(e) => setNovoTicker(e.target.value)} placeholder="Ticker (ex.: PETR4)" />
          <input style={{ ...inp, width: 90, textAlign: 'right' }} type="number" step="any" value={novoPct} onChange={(e) => setNovoPct(e.target.value)} placeholder="%" />
          <button onClick={adicionar} style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: 'var(--forest-2)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+</button>
        </div>
      </section>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, marginBottom: 12,
        background: fecha ? 'var(--up-bg)' : 'var(--amber-bg)',
        color: fecha ? 'var(--up)' : 'var(--amber)',
      }}>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Soma do grupo</span>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
          {soma.toFixed(1)}% {fecha ? '✓' : '— não fecha 100%'}
        </span>
      </div>

      <button onClick={salvar} disabled={estado === 'enviando'} style={{
        width: '100%', padding: '12px', borderRadius: 9, border: 0, cursor: 'pointer',
        background: 'var(--forest)', color: '#fff', fontSize: 14, fontWeight: 600,
      }}>{estado === 'enviando' ? 'Salvando…' : `Salvar ${g.name}`}</button>

      {msg && <p style={{ marginTop: 10, fontSize: 13, fontWeight: 500, color: estado === 'erro' ? 'var(--down)' : 'var(--up)' }}>{msg}</p>}
    </div>
  );
}
