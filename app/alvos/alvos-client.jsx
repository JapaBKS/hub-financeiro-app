'use client';
import { useState } from 'react';

const inp = {
  padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 14,
  fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--ink)',
};

export default function AlvosClient({ grupos: gruposIniciais }) {
  const [grupos, setGrupos] = useState(gruposIniciais);
  const [aba, setAba] = useState(0);
  const [novoTicker, setNovoTicker] = useState('');
  const [novoPct, setNovoPct] = useState('');
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');
  const [novaAba, setNovaAba] = useState('');
  const [criando, setCriando] = useState(false);

  const g = grupos[aba];

  const soma = g ? g.itens.reduce((s, it) => s + (Number(it.pct) || 0), 0) : 0;
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
  function alternarCongelado(idx) {
    setItens(g.itens.map((it, i) => (i === idx ? { ...it, congelado: !it.congelado } : it)));
  }
  function adicionar() {
    const tk = novoTicker.trim().toUpperCase();
    if (!tk) return;
    if (g.itens.some((it) => it.ticker === tk)) { setMsg(`${tk} já está na lista.`); return; }
    setItens([...g.itens, { ticker: tk, pct: Number(novoPct) || 0, congelado: false }]);
    setNovoTicker(''); setNovoPct('');
  }

  async function salvar() {
    setEstado('enviando'); setMsg('');
    const res = await fetch('/api/targets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        class_id: g.class_id,
        itens: g.itens.map((it) => ({ ticker: it.ticker, pct: (Number(it.pct) || 0) / 100, congelado: !!it.congelado })),
      }),
    });
    if (res.ok) { setEstado('ok'); setMsg('Salvo!'); }
    else { setEstado('erro'); setMsg('Erro ao salvar.'); }
  }

  async function criarAba() {
    const nome = novaAba.trim();
    if (!nome) return;
    setCriando(true);
    const res = await fetch('/api/classes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nome }),
    });
    const data = await res.json().catch(() => ({}));
    setCriando(false);
    if (res.ok && data.ok) window.location.reload();
    else { setEstado('erro'); setMsg(data.erro || 'Não foi possível criar a aba.'); }
  }

  async function renomearAba() {
    const nome = window.prompt('Novo nome da aba:', g.name);
    if (!nome || nome.trim() === g.name) return;
    const res = await fetch('/api/classes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: g.class_id, name: nome.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) window.location.reload();
    else { setEstado('erro'); setMsg(data.erro || 'Não foi possível renomear.'); }
  }

  async function excluirAba() {
    if (!window.confirm(`Excluir a aba "${g.name}"? Só funciona se não houver nenhum ativo nela.`)) return;
    const res = await fetch('/api/classes', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: g.class_id }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.ok) window.location.reload();
    else { setEstado('erro'); setMsg(data.erro || 'Não foi possível excluir.'); }
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {grupos.map((x, i) => (
          <button key={x.class_id} onClick={() => { setAba(i); setMsg(''); }} style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: '1px solid ' + (i === aba ? 'var(--forest)' : 'var(--line)'),
            background: i === aba ? 'var(--forest)' : 'var(--surface)', color: i === aba ? '#fff' : 'var(--ink-soft)',
          }}>{x.name}</button>
        ))}
      </div>

      <section className="card" style={{ marginBottom: 12, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={{ ...inp, flex: 1, minWidth: 140 }} value={novaAba} onChange={(e) => setNovaAba(e.target.value)}
          placeholder="Nome da nova aba (ex.: Cripto)" />
        <button onClick={criarAba} disabled={criando || !novaAba.trim()} style={{
          padding: '8px 14px', borderRadius: 8, border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          background: 'var(--forest-2)', color: '#fff', opacity: novaAba.trim() ? 1 : 0.5,
        }}>{criando ? 'Criando…' : '+ nova aba'}</button>
      </section>

      {!g && <div className="card" style={{ padding: 20, fontSize: 13, color: 'var(--ink-faint)' }}>Nenhuma aba ainda. Crie a primeira acima.</div>}

      {g && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              Esta aba é <b style={{ color: 'var(--ink)' }}>{(g.groupTarget * 100).toFixed(1).replace(/\.0$/, '')}%</b> da carteira.
              Os pesos abaixo somam 100% entre os ativos dela.
              {g.semPeso > 0 && (
                <span style={{ color: 'var(--amber)' }}> · {g.semPeso} ativo(s) sem peso (aparecem como “reduzir”).</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={renomearAba} style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-soft)', cursor: 'pointer' }}>renomear</button>
              <button onClick={excluirAba} style={{ fontSize: 11.5, padding: '4px 9px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--down)', cursor: 'pointer' }}>excluir aba</button>
            </div>
          </div>

          <section className="card" style={{ marginBottom: 12 }}>
            {g.itens.map((it, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid var(--line-soft)', flexWrap: 'wrap' }}>
                <b style={{ fontFamily: 'var(--font-display)', flex: 1, minWidth: 70 }}>{it.ticker}</b>
                <input style={{ ...inp, width: 90, textAlign: 'right' }} type="number" step="any" value={it.pct}
                  onChange={(e) => mudarPct(idx, e.target.value)} />
                <span style={{ color: 'var(--ink-faint)', fontSize: 13 }}>%</span>
                <label title="congelado: nunca sugerir comprar ou vender esse ativo" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: it.congelado ? 'var(--forest-2)' : 'var(--ink-faint)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  <input type="checkbox" checked={!!it.congelado} onChange={() => alternarCongelado(idx)} style={{ margin: 0 }} />
                  congelado
                </label>
                <button onClick={() => remover(idx)} title="Remover" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18, padding: '0 2px' }}>×</button>
              </div>
            ))}
            {g.itens.length === 0 && <div style={{ padding: 16, fontSize: 13, color: 'var(--ink-faint)' }}>Nenhum ativo nesta aba. Adicione abaixo.</div>}

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: 'var(--surface-2)', flexWrap: 'wrap' }}>
              <input style={{ ...inp, flex: 1, minWidth: 120 }} value={novoTicker} onChange={(e) => setNovoTicker(e.target.value)} placeholder="Ticker (ex.: VWRA11)" />
              <input style={{ ...inp, width: 90, textAlign: 'right' }} type="number" step="any" value={novoPct} onChange={(e) => setNovoPct(e.target.value)} placeholder="%" />
              <button onClick={adicionar} style={{ padding: '8px 12px', borderRadius: 8, border: 0, background: 'var(--forest-2)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+</button>
            </div>
          </section>

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, marginBottom: 12,
            background: fecha ? 'var(--up-bg)' : 'var(--amber-bg)',
            color: fecha ? 'var(--up)' : 'var(--amber)',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Soma da aba</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>
              {soma.toFixed(1)}% {fecha ? '✓' : '— não fecha 100%'}
            </span>
          </div>

          <button onClick={salvar} disabled={estado === 'enviando'} style={{
            width: '100%', padding: '12px', borderRadius: 9, border: 0, cursor: 'pointer',
            background: 'var(--forest)', color: '#fff', fontSize: 14, fontWeight: 600,
          }}>{estado === 'enviando' ? 'Salvando…' : `Salvar ${g.name}`}</button>
        </>
      )}

      {msg && <p style={{ marginTop: 10, fontSize: 13, fontWeight: 500, color: estado === 'erro' ? 'var(--down)' : 'var(--up)' }}>{msg}</p>}
    </div>
  );
}
