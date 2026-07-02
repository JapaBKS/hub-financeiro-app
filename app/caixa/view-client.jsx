'use client';
import { useState, useRef, useEffect } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotulo = (ym) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]}/${a}`; };
const hojeISO = () => new Date().toISOString().slice(0, 10);
const mesDe = (iso) => (iso || '').slice(0, 7);
const brDate = (iso) => (iso || '').slice(0, 10).split('-').reverse().join('/');

const inp = { padding: '9px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13.5, fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: '#fff', width: '100%' };

export default function CaixaView({ resumo, categorias, bills = [] }) {
  const mesAtual = mesDe(hojeISO());
  const mesesDisponiveis = resumo.map((r) => r.mes);
  const inicial = mesesDisponiveis.includes(mesAtual) ? mesAtual : (mesesDisponiveis[mesesDisponiveis.length - 1] || mesAtual);
  const [mes, setMes] = useState(inicial);

  // agrupa meses por ano (asc), com anos anteriores recolhidos
  const anoAtual = String(new Date().getFullYear());
  const porAno = {};
  mesesDisponiveis.forEach((m) => { const a = m.slice(0, 4); (porAno[a] = porAno[a] || []).push(m); });
  const anos = Object.keys(porAno).sort();
  const [anosAbertos, setAnosAbertos] = useState(() => new Set([mes.slice(0, 4), anoAtual]));
  const toggleAno = (a) => setAnosAbertos((s) => { const n = new Set(s); n.has(a) ? n.delete(a) : n.add(a); return n; });

  const activeRef = useRef(null);
  useEffect(() => { activeRef.current?.scrollIntoView({ inline: 'center', block: 'nearest' }); }, [mes]);

  // após inserir fixas e recarregar, reabre no mês alvo
  useEffect(() => {
    try {
      const alvo = sessionStorage.getItem('caixa_mes');
      if (alvo) {
        sessionStorage.removeItem('caixa_mes');
        if (mesesDisponiveis.includes(alvo)) {
          setMes(alvo);
          setAnosAbertos((s) => new Set([...s, alvo.slice(0, 4)]));
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const atual = resumo.find((r) => r.mes === mes) || { mes, itens: [], saldoInicial: 0, entradasPagas: 0, saidasPagas: 0, entradasPend: 0, saidasPend: 0, saldoDisponivel: 0, aumentoMensal: 0, aumentoTotal: 0 };

  const temPendente = atual.saidasPend > 0 || atual.entradasPend > 0;
  const temItens = atual.itens.length > 0;

  // próximo mês (YYYY-MM) e se ele ainda não existe
  const proxMes = (() => {
    const [a, m] = mes.split('-').map(Number);
    const d = new Date(a, m, 1); // m já é 1-based -> avança 1
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();
  const proxExiste = mesesDisponiveis.includes(proxMes);

  // form de lançamento
  const [showForm, setShowForm] = useState(false);
  const [f, setF] = useState({ entry_date: hojeISO(), details: '', category: '', amount: '', kind: 'saida', paid: true });
  const [salvando, setSalvando] = useState(false);

  async function lancar() {
    if (!f.amount) return;
    setSalvando(true);
    const res = await fetch('/api/cashbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    setSalvando(false);
    if (res.ok) window.location.reload();
  }

  const [lancandoFixas, setLancandoFixas] = useState(false);

  async function inserirFixas(alvoMes) {
    const res = await fetch('/api/cashbook-recurring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: alvoMes }) });
    return res.ok;
  }

  async function abrirProximoMes() {
    setLancandoFixas(true);
    await inserirFixas(proxMes); // insere as fixas do próximo mês (pendentes)
    // guarda o mês alvo pra reabrir nele após o reload
    try { sessionStorage.setItem('caixa_mes', proxMes); } catch {}
    window.location.reload();
  }

  async function lancarFixasDesteMes() {
    setLancandoFixas(true);
    await inserirFixas(mes);
    try { sessionStorage.setItem('caixa_mes', mes); } catch {}
    window.location.reload();
  }

  // valores em conferência (edição inline das contas de valor variável)
  const [revVals, setRevVals] = useState({});
  const [puxando, setPuxando] = useState(null);

  async function puxarFatura(it) {
    if (!it.card_id) return;
    setPuxando(it.id);
    const res = await fetch(`/api/fatura-pai?card_id=${it.card_id}&month=${mes}`);
    const data = await res.json().catch(() => ({}));
    setPuxando(null);
    if (res.ok && data.ok) setRevVals((v) => ({ ...v, [it.id]: String(data.total_pai.toFixed(2)) }));
  }

  async function confirmarValor(it) {
    const novo = revVals[it.id] != null ? Number(revVals[it.id]) : Number(it.amount);
    await fetch('/api/cashbook', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, amount: novo, needs_review: false }) });
    window.location.reload();
  }

  async function togglePago(it) {
    await fetch('/api/cashbook', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, paid: !it.paid }) });
    window.location.reload();
  }
  async function apagar(it) {
    if (!confirm(`Apagar "${it.details || 'lançamento'}"?`)) return;
    await fetch('/api/cashbook', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id }) });
    window.location.reload();
  }

  const itens = [...atual.itens].sort((a, b) => (a.entry_date || '').localeCompare(b.entry_date || '') || (a.id - b.id));

  return (
    <div>
      {/* navegação de meses agrupada por ano */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
        <a href="/caixa/fixas" style={{ fontSize: 12.5, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 600 }}>contas fixas →</a>
      </div>
      {anos.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {anos.map((a) => {
            const aberto = anosAbertos.has(a);
            return (
              <div key={a} style={{ marginBottom: 4 }}>
                <button onClick={() => toggleAno(a)} style={{
                  display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, cursor: 'pointer',
                  fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)', letterSpacing: '.03em', padding: '2px 2px 4px',
                }}>
                  <span style={{ transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform .2s', fontSize: 9 }}>▸</span>{a}
                </button>
                {aberto && (
                  <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 6 }}>
                    {porAno[a].map((m) => (
                      <button key={m} ref={m === mes ? activeRef : null} onClick={() => setMes(m)} style={{
                        padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', whiteSpace: 'nowrap',
                        fontSize: 12.5, fontWeight: 600, textTransform: 'capitalize',
                        background: m === mes ? 'var(--forest)' : '#fff', color: m === mes ? '#fff' : 'var(--ink-soft)',
                      }}>{MESES[Number(m.slice(5, 7)) - 1]}</button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* saldo disponível */}
      <section className="card" style={{ padding: '18px 20px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>Saldo disponível</div>
        <div style={{ fontSize: 30, fontWeight: 700, fontFamily: 'var(--font-display)', color: atual.saldoDisponivel >= 0 ? 'var(--forest-2)' : 'var(--down)' }}>{fmt(atual.saldoDisponivel)}</div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, color: 'var(--ink-soft)', flexWrap: 'wrap' }}>
          <span>saldo anterior <b style={{ fontFamily: 'var(--font-display)' }}>{fmt(atual.saldoInicial)}</b></span>
          <span style={{ color: 'var(--up)' }}>+ entradas {fmt(atual.entradasPagas)}</span>
          <span style={{ color: 'var(--down)' }}>− saídas {fmt(atual.saidasPagas)}</span>
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12 }}>
          <span style={{ color: atual.aumentoMensal >= 0 ? 'var(--up)' : 'var(--down)' }}>
            {atual.aumentoMensal >= 0 ? '▲' : '▼'} mês {fmt(Math.abs(atual.aumentoMensal))}
          </span>
          <span style={{ color: atual.aumentoTotal >= 0 ? 'var(--up)' : 'var(--down)' }}>
            {atual.aumentoTotal >= 0 ? '▲' : '▼'} total {fmt(Math.abs(atual.aumentoTotal))}
          </span>
        </div>
      </section>

      {/* status do mês: tudo pago vs pendente */}
      {temItens && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '10px 14px', borderRadius: 10,
          background: temPendente ? 'var(--amber-bg)' : 'var(--up-bg)',
          border: `1px solid ${temPendente ? 'var(--amber)' : 'var(--up)'}22`,
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: temPendente ? 'var(--amber)' : 'var(--up)' }}>
            {temPendente ? '⚠ Tem lançamento pendente' : '✓ Tudo quitado neste mês'}
          </span>
          {!temPendente && (
            <button onClick={abrirProximoMes} style={{
              marginLeft: 'auto', padding: '7px 12px', borderRadius: 8, border: 0, cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, background: 'var(--forest)', color: '#fff',
            }}>{proxExiste ? `ir para ${rotulo(proxMes)} →` : `abrir ${rotulo(proxMes)} →`}</button>
          )}
        </div>
      )}
      {(atual.saidasPend > 0 || atual.entradasPend > 0) && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
          {atual.saidasPend > 0 && (
            <div className="card" style={{ flex: 1, minWidth: 160, padding: '12px 16px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Saídas a pagar</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--down)' }}>{fmt(atual.saidasPend)}</div>
            </div>
          )}
          {atual.entradasPend > 0 && (
            <div className="card" style={{ flex: 1, minWidth: 160, padding: '12px 16px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Entradas a receber</div>
              <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--up)' }}>{fmt(atual.entradasPend)}</div>
            </div>
          )}
        </div>
      )}

      {/* botão lançar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 10 }}>
        {bills.length > 0 && (
          <button onClick={lancarFixasDesteMes} disabled={lancandoFixas} style={{
            padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
            border: '1px solid var(--forest)', background: 'var(--brass-bg, #F3ECD9)', color: 'var(--forest-2)',
          }}>{lancandoFixas ? 'Lançando…' : '↻ lançar fixas'}</button>
        )}
        <button onClick={() => setShowForm((v) => !v)} style={{
          padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          border: '1px solid var(--forest)', background: showForm ? '#fff' : 'var(--forest)', color: showForm ? 'var(--forest-2)' : '#fff',
        }}>{showForm ? 'Fechar' : '+ lançar'}</button>
      </div>

      {/* form de lançamento */}
      {showForm && (
        <section className="card" style={{ padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={() => setF({ ...f, kind: 'entrada' })} style={{ flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, border: '1px solid var(--line)', background: f.kind === 'entrada' ? 'var(--up-bg)' : '#fff', color: f.kind === 'entrada' ? 'var(--up)' : 'var(--ink-soft)' }}>Entrada</button>
            <button onClick={() => setF({ ...f, kind: 'saida' })} style={{ flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, border: '1px solid var(--line)', background: f.kind === 'saida' ? 'var(--down-bg)' : '#fff', color: f.kind === 'saida' ? 'var(--down)' : 'var(--ink-soft)' }}>Saída</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <input style={inp} type="date" value={f.entry_date} onChange={(e) => setF({ ...f, entry_date: e.target.value })} />
            <input style={inp} type="number" step="0.01" placeholder="Valor" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} />
          </div>
          <input style={{ ...inp, marginBottom: 8 }} placeholder="Detalhes" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />
          <input style={{ ...inp, marginBottom: 8 }} placeholder="Categoria" list="cats-caixa" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          <datalist id="cats-caixa">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-soft)', marginBottom: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.paid} onChange={(e) => setF({ ...f, paid: e.target.checked })} /> já {f.kind === 'entrada' ? 'recebido' : 'pago'}
          </label>
          <button onClick={lancar} disabled={salvando || !f.amount} style={{ width: '100%', padding: 11, borderRadius: 9, border: 0, cursor: 'pointer', background: 'var(--forest)', color: '#fff', fontSize: 14, fontWeight: 600 }}>{salvando ? 'Salvando…' : 'Lançar'}</button>
        </section>
      )}

      {/* lista do mês */}
      <section className="card">
        <div className="card-h"><h2>Lançamentos · <span style={{ textTransform: 'capitalize' }}>{rotulo(mes)}</span></h2></div>
        <div>
          {itens.length === 0 && <div style={{ padding: '16px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>Nada lançado neste mês.</div>}
          {itens.map((it) => {
            const entrada = it.kind === 'entrada';
            if (it.needs_review) {
              return (
                <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderBottom: '1px solid var(--line-soft)', background: 'var(--amber-bg)' }}>
                  <div style={{ minWidth: 44, fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-display)' }}>{brDate(it.entry_date).slice(0, 5)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.details || '—'}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--amber)', fontWeight: 700 }}>valor a conferir</div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>R$</span>
                  <input type="number" step="0.01" value={revVals[it.id] ?? String(it.amount)}
                    onChange={(e) => setRevVals((v) => ({ ...v, [it.id]: e.target.value }))}
                    style={{ width: 84, padding: '7px 8px', borderRadius: 7, border: '1px solid var(--amber)', fontSize: 13, textAlign: 'right', fontFamily: 'var(--font-display)', background: '#fff' }} />
                  {it.card_id && (
                    <button onClick={() => puxarFatura(it)} disabled={puxando === it.id} title="puxar valor da fatura" style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', fontSize: 12, color: 'var(--forest-2)' }}>{puxando === it.id ? '…' : '↻'}</button>
                  )}
                  <button onClick={() => confirmarValor(it)} title="confirmar valor" style={{ border: 0, background: 'var(--forest)', color: '#fff', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>ok</button>
                  <button onClick={() => apagar(it)} title="apagar" style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--down)' }}>✕</button>
                </div>
              );
            }
            return (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderBottom: '1px solid var(--line-soft)', opacity: it.paid ? 1 : 0.72 }}>
                <div style={{ minWidth: 44, fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-display)' }}>{brDate(it.entry_date).slice(0, 5)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.details || '—'}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{it.category}{!it.paid && <span style={{ color: 'var(--amber)', fontWeight: 600 }}> · pendente</span>}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: entrada ? 'var(--up)' : 'var(--down)' }}>{entrada ? '+' : '−'}{fmt(it.amount)}</div>
                <button onClick={() => togglePago(it)} title={it.paid ? 'marcar pendente' : 'marcar pago'} style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--ink-soft)' }}>{it.paid ? '✓' : '○'}</button>
                <button onClick={() => apagar(it)} title="apagar" style={{ border: '1px solid var(--line)', background: '#fff', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--down)' }}>✕</button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
