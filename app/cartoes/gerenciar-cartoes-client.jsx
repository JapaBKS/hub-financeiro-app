'use client';
import { useState } from 'react';


export default function GerenciarCartoes({ cards }) {
  const [novo, setNovo] = useState({ name: '', due_day: '' });
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState(false);

  async function chamar(metodo, body) {
    setBusy(true); setMsg('');
    const res = await fetch('/api/cards', {
      method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok && data.ok) { window.location.reload(); return true; }
    setErro(true); setMsg(data.erro || 'Não foi possível salvar.');
    return false;
  }

  const criar = () => chamar('POST', { name: novo.name, due_day: Number(novo.due_day) });
  const salvar = (id) => chamar('PATCH', { id, name: edit.name, due_day: Number(edit.due_day) });
  const alternarAtivo = (c) => chamar('PATCH', { id: c.id, ativo: !c.ativo });
  const excluir = (c) => {
    if (!window.confirm(`Excluir o cartão "${c.name}"? Só funciona se ele não tiver histórico.`)) return;
    chamar('DELETE', { id: c.id });
  };

  const btn = (extra = {}) => ({
    fontSize: 11.5, fontWeight: 600, padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
    border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-soft)', ...extra,
  });

  const ativos = cards.filter((c) => c.ativo !== false);
  const inativos = cards.filter((c) => c.ativo === false);

  const linhaCartao = (c) => {
    const editando = editId === c.id;
    return (
      <div key={c.id} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '11px 16px',
        borderBottom: '1px solid var(--line-soft)', flexWrap: 'wrap',
        opacity: c.ativo === false ? 0.6 : 1,
      }}>
        {editando ? (
          <>
            <input className="campo" style={{ flex: 1, minWidth: 120 }} value={edit.name}
              onChange={(e) => setEdit((f) => ({ ...f, name: e.target.value }))} />
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>vence dia</span>
            <input className="campo" style={{ width: 66, textAlign: 'right' }} type="number" min="1" max="31" value={edit.due_day}
              onChange={(e) => setEdit((f) => ({ ...f, due_day: e.target.value }))} />
            <button onClick={() => salvar(c.id)} disabled={busy} style={btn({ background: 'var(--forest)', color: '#fff', border: 0 })}>salvar</button>
            <button onClick={() => setEditId(null)} style={btn()}>cancelar</button>
          </>
        ) : (
          <>
            <div style={{ flex: 1, minWidth: 120 }}>
              <b style={{ fontSize: 13.5 }}>{c.name}</b>
              {c.ativo === false && (
                <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-faint)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 5px', marginLeft: 6 }}>INATIVO</span>
              )}
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 1 }}>vence todo dia {c.due_day}</div>
            </div>
            <button onClick={() => { setEditId(c.id); setEdit({ name: c.name, due_day: c.due_day }); }} style={btn()}>editar</button>
            <button onClick={() => alternarAtivo(c)} disabled={busy} style={btn({ color: c.ativo === false ? 'var(--forest-2)' : 'var(--ink-faint)' })}>
              {c.ativo === false ? 'reativar' : 'desativar'}
            </button>
            <button onClick={() => excluir(c)} disabled={busy} style={btn({ color: 'var(--down)' })}>excluir</button>
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 620 }}>
      <section className="card" style={{ marginBottom: 14 }}>
        <div className="card-h"><h2>Cartões cadastrados</h2></div>
        {ativos.map((c) => linhaCartao(c))}
        {ativos.length === 0 && (
          <div style={{ padding: 16, fontSize: 13, color: 'var(--ink-faint)' }}>Nenhum cartão ativo.</div>
        )}

        {inativos.length > 0 && (
          <>
            <div style={{ padding: '10px 16px 4px', fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.03em' }}>
              Guardados ({inativos.length})
            </div>
            {inativos.map((c) => linhaCartao(c))}
          </>
        )}
      </section>

      <section className="card" style={{ padding: '4px 0 16px' }}>
        <div className="card-h"><h2>Adicionar cartão</h2></div>
        <div style={{ display: 'flex', gap: 8, padding: '10px 16px 0', alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="campo" style={{ flex: 1, minWidth: 150 }} value={novo.name}
            onChange={(e) => setNovo((f) => ({ ...f, name: e.target.value }))} placeholder="Nome (ex.: Nubank)" />
          <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>vence dia</span>
          <input className="campo" style={{ width: 70, textAlign: 'right' }} type="number" min="1" max="31" value={novo.due_day}
            onChange={(e) => setNovo((f) => ({ ...f, due_day: e.target.value }))} placeholder="15" />
          <button onClick={criar} disabled={busy || !novo.name.trim() || !novo.due_day} style={{
            padding: '9px 15px', borderRadius: 9, border: 0, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
            background: 'var(--forest)', color: '#fff', opacity: (!novo.name.trim() || !novo.due_day) ? 0.5 : 1,
          }}>{busy ? '…' : '+ adicionar'}</button>
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: '10px 16px 0', lineHeight: 1.5 }}>
          Cartões sem uso podem ser <b>desativados</b> em vez de excluídos — eles somem dos lançamentos
          mas as faturas antigas continuam no histórico.
        </p>
        {msg && <p style={{ margin: '10px 16px 0', fontSize: 12.5, color: erro ? 'var(--down)' : 'var(--up)' }}>{msg}</p>}
      </section>
    </div>
  );
}
