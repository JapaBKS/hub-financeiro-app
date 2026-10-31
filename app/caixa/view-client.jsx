'use client';
import { useState, useRef, useEffect } from 'react';
import { brl as fmt } from '../../lib/format';
import { CORES, arcPath, fatiar } from '../ui/donut';
import { hojeISO } from '../../lib/dominio/datas';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotulo = (ym) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]}/${a}`; };
const mesDe = (iso) => (iso || '').slice(0, 7);
const brDate = (iso) => (iso || '').slice(0, 10).split('-').reverse().join('/');

const inp = { padding: '9px 10px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 13.5, fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: 'var(--surface)', width: '100%' };


export default function CaixaView({ resumo, categorias, bills = [] }) {
  const mesAtual = mesDe(hojeISO());
  const mesesDisponiveis = resumo.map((r) => r.mes);
  // mês padrão (igual ao que o servidor calcularia, evita mismatch de hidratação)
  const inicialPadrao = mesesDisponiveis.includes(mesAtual) ? mesAtual : (mesesDisponiveis[mesesDisponiveis.length - 1] || mesAtual);
  const [mes, setMesRaw] = useState(inicialPadrao);
  // ao trocar de mês, guarda na URL (sem navegar) pra sobreviver a um reload (ex.: confirmar pagamento)
  function setMes(novoMes) {
    setMesRaw(novoMes);
    // lembra o último mês aberto (por 7 dias) para a aba não voltar sempre ao mês corrente
    try { localStorage.setItem('caixa_mes_ultimo', JSON.stringify({ mes: novoMes, em: Date.now() })); } catch {}
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('mes', novoMes);
      window.history.replaceState({}, '', url);
    }
  }
  // após montar, se a URL já guardava um mês válido (voltando de um reload), usa ele
  useEffect(() => {
    const mesDaUrl = new URLSearchParams(window.location.search).get('mes');
    if (mesDaUrl && mesDaUrl !== mes && mesesDisponiveis.includes(mesDaUrl)) { setMesRaw(mesDaUrl); return; }
    if (!mesDaUrl) {
      try {
        const guardado = JSON.parse(localStorage.getItem('caixa_mes_ultimo') || 'null');
        const recente = guardado && Date.now() - guardado.em < 7 * 24 * 3600 * 1000;
        if (recente && guardado.mes !== mes && mesesDisponiveis.includes(guardado.mes)) {
          setMesRaw(guardado.mes);
          setAnosAbertos((a) => new Set([...a, guardado.mes.slice(0, 4)]));
        }
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // agrupa meses por ano (asc), com anos anteriores recolhidos
  const anoAtual = String(new Date().getFullYear());
  const porAno = {};
  mesesDisponiveis.forEach((m) => { const a = m.slice(0, 4); (porAno[a] = porAno[a] || []).push(m); });
  const anos = Object.keys(porAno).sort();
  const [anosAbertos, setAnosAbertos] = useState(() => new Set([mes.slice(0, 4), anoAtual]));
  const toggleAno = (a) => setAnosAbertos((s) => { const n = new Set(s); n.has(a) ? n.delete(a) : n.add(a); return n; });

  const activeRef = useRef(null);

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
    if (!res.ok || !data.ok) { setPuxando(null); return; }

    const valor = Number(data.total_pai) || 0;
    setRevVals((v) => ({ ...v, [it.id]: valor.toFixed(2) }));

    // grava o valor já — segue como "a conferir" pra você poder revisar antes do ok
    await fetch('/api/cashbook', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: it.id, amount: valor, needs_review: true }),
    }).catch(() => {});
    setPuxando(null);
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

  async function reconferir(it) {
    // volta o lançamento pro modo "valor a conferir" (permite reeditar o valor depois do ok)
    await fetch('/api/cashbook', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id, needs_review: true }) });
    window.location.reload();
  }
  async function apagar(it) {
    if (!confirm(`Apagar "${it.details || 'lançamento'}"?`)) return;
    await fetch('/api/cashbook', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id }) });
    window.location.reload();
  }

  const itens = [...atual.itens].sort((a, b) => (a.entry_date || '').localeCompare(b.entry_date || '') || (a.id - b.id));

  // fechamento do mês
  const entrouTotal = atual.entradasPagas + atual.entradasPend;
  const saiuTotal = atual.saidasPagas + atual.saidasPend;
  const resultadoMes = entrouTotal - saiuTotal;
  const sobraFinal = atual.saldoInicial + resultadoMes; // considera o que veio do mês anterior

  // gastos por categoria (todas as saídas do mês: pagas + a pagar)
  const gastosCategoria = (() => {
    const map = {};
    atual.itens.filter((i) => i.kind === 'saida').forEach((i) => {
      const c = i.category || 'Sem categoria';
      map[c] = (map[c] || 0) + Number(i.amount);
    });
    // só entra no gráfico quem tem valor: categoria zerada (ex.: compra 100% do
    // pai, onde a sua parte é zero) poluía a legenda com 0%
    return Object.entries(map)
      .map(([cat, val]) => ({ cat, val }))
      .filter((c) => c.val > 0.005)
      .sort((a, b) => b.val - a.val);
  })();
  const gastoTotal = gastosCategoria.reduce((s, c) => s + c.val, 0);
  const fatias = fatiar(gastosCategoria);

  return (
    <div>
      {/* HERO: saldo disponível */}
      <section className="card hero" style={{ marginBottom: 18 }}>
        <div className="hero-top">
          <div>
            <div className="eyebrow">Saldo disponível · <span style={{ textTransform: 'capitalize' }}>{rotulo(mes)}</span></div>
            <div className="big" style={atual.saldoDisponivel < 0 ? { color: 'var(--down)' } : undefined}>
              <small>R$</small>{atual.saldoDisponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12.5, color: 'var(--ink-soft)', flexWrap: 'wrap' }}>
              <span>anterior <b style={{ fontFamily: 'var(--font-display)' }}>{fmt(atual.saldoInicial)}</b></span>
              <span style={{ color: 'var(--up)' }}>+ entradas {fmt(atual.entradasPagas)}</span>
              <span style={{ color: 'var(--down)' }}>− saídas {fmt(atual.saidasPagas)}</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            {temItens && (
              <span style={{ fontSize: 12.5, fontWeight: 600, padding: '5px 11px', borderRadius: 999, background: temPendente ? 'var(--amber-bg)' : 'var(--up-bg)', color: temPendente ? 'var(--amber)' : 'var(--up)' }}>
                {temPendente ? '⚠ tem pendente' : '✓ tudo quitado'}
              </span>
            )}
            {temItens && !temPendente && (
              <button onClick={abrirProximoMes} disabled={lancandoFixas} style={{ padding: '7px 12px', borderRadius: 8, border: 0, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: 'var(--forest)', color: '#fff' }}>
                {lancandoFixas ? 'Abrindo…' : proxExiste ? `ir para ${rotulo(proxMes)} →` : `abrir ${rotulo(proxMes)} →`}
              </button>
            )}
            <div style={{ display: 'flex', gap: 14, fontSize: 12, marginTop: 2 }}>
              <span style={{ color: atual.aumentoMensal >= 0 ? 'var(--up)' : 'var(--down)' }}>{atual.aumentoMensal >= 0 ? '▲' : '▼'} mês {fmt(Math.abs(atual.aumentoMensal))}</span>
              <span style={{ color: atual.aumentoTotal >= 0 ? 'var(--up)' : 'var(--down)' }}>{atual.aumentoTotal >= 0 ? '▲' : '▼'} total {fmt(Math.abs(atual.aumentoTotal))}</span>
            </div>
          </div>
        </div>
      </section>

      {/* FECHAMENTO DO MÊS */}
      {temItens && (
        <section className="card" style={{ marginBottom: 18, padding: '16px 20px' }}>
          <div className="card-h" style={{ padding: 0, marginBottom: 12 }}><h2 style={{ margin: 0 }}>Fechamento · <span style={{ textTransform: 'capitalize' }}>{rotulo(mes)}</span></h2></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'baseline', marginBottom: gastoTotal > 0 ? 16 : 0 }}>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Saldo anterior</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 }}>{fmt(atual.saldoInicial)}</div>
            </div>
            <span style={{ fontSize: 18, color: 'var(--up)', alignSelf: 'center', fontWeight: 600 }}>+</span>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Entrou</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--up)' }}>{fmt(entrouTotal)}</div>
            </div>
            <span style={{ fontSize: 18, color: 'var(--down)', alignSelf: 'center', fontWeight: 600 }}>−</span>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Saiu</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17, color: 'var(--down)' }}>{fmt(saiuTotal)}</div>
            </div>
            <span style={{ fontSize: 18, color: 'var(--ink-faint)', alignSelf: 'center', fontWeight: 600 }}>=</span>
            <div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Sobra final</div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: sobraFinal >= 0 ? 'var(--up)' : 'var(--down)' }}>{fmt(sobraFinal)}</div>
            </div>
          </div>
          {resultadoMes < 0 && sobraFinal >= 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: -4, marginBottom: gastoTotal > 0 ? 16 : 0 }}>
              No mês saiu mais do que entrou ({fmt(Math.abs(resultadoMes))}), mas o saldo anterior cobriu.
            </div>
          )}

          {gastoTotal > 0 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginBottom: 8 }}>Gastos por categoria · <b style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{fmt(gastoTotal)}</b></div>
              <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
                <svg viewBox="0 0 150 150" width="150" height="150" style={{ flex: 'none' }}>
                  {fatias.length === 1 ? (
                    <circle cx="75" cy="75" r="56" fill="none" stroke={fatias[0].color} strokeWidth="28" />
                  ) : (
                    fatias.map((s) => <path key={s.cat} d={arcPath(s.a0, s.a1, 75, 75, 70, 42)} fill={s.color} />)
                  )}
                  <text x="75" y="80" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--ink)" style={{ fontFamily: 'var(--font-display)' }}>{fmt(gastoTotal)}</text>
                </svg>
                <div style={{ flex: 1, minWidth: 180 }}>
                  {fatias.map((g) => (
                    <div key={g.cat} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: 13 }}>
                      <span style={{ width: 11, height: 11, borderRadius: 3, background: g.color, flex: 'none' }} />
                      <span style={{ color: 'var(--ink-soft)' }}>{g.cat}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(g.val)}<span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 400 }}> · {Math.round(g.frac * 100)}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* GRID: lançamentos | lateral */}
      <div className="grid-wide">
        {/* coluna principal: ações + lista */}
        <div>
          <div className="acoes-row" style={{ marginBottom: 10 }}>
            {bills.length > 0 && (
              <button onClick={lancarFixasDesteMes} disabled={lancandoFixas} style={{
                padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                border: '1px solid var(--forest)', background: 'var(--brass-bg, #F3ECD9)', color: 'var(--forest-2)',
              }}>{lancandoFixas ? 'Lançando…' : '↻ lançar fixas'}</button>
            )}
            <button onClick={() => setShowForm((v) => !v)} style={{
              padding: '8px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              border: '1px solid var(--forest)', background: showForm ? 'var(--surface)' : 'var(--forest)', color: showForm ? 'var(--forest-2)' : '#fff',
            }}>{showForm ? 'Fechar' : '+ lançar'}</button>
          </div>

          {showForm && (
            <section className="card" style={{ padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <button onClick={() => setF({ ...f, kind: 'entrada' })} style={{ flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, border: '1px solid var(--line)', background: f.kind === 'entrada' ? 'var(--up-bg)' : 'var(--surface)', color: f.kind === 'entrada' ? 'var(--up)' : 'var(--ink-soft)' }}>Entrada</button>
                <button onClick={() => setF({ ...f, kind: 'saida' })} style={{ flex: 1, padding: '9px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, border: '1px solid var(--line)', background: f.kind === 'saida' ? 'var(--down-bg)' : 'var(--surface)', color: f.kind === 'saida' ? 'var(--down)' : 'var(--ink-soft)' }}>Saída</button>
              </div>
              <div className="grid2" style={{ marginBottom: 8 }}>
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
                        style={{ width: 84, padding: '7px 8px', borderRadius: 7, border: '1px solid var(--amber)', fontSize: 13, textAlign: 'right', fontFamily: 'var(--font-display)', background: 'var(--surface)' }} />
                      {it.card_id && (
                        <button onClick={() => puxarFatura(it)} disabled={puxando === it.id} title="puxar valor da fatura" style={{ border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', fontSize: 12, color: 'var(--forest-2)' }}>{puxando === it.id ? '…' : '↻'}</button>
                      )}
                      <button onClick={() => confirmarValor(it)} title="confirmar valor" style={{ border: 0, background: 'var(--forest)', color: '#fff', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>ok</button>
                      <button onClick={() => apagar(it)} title="apagar" style={{ border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--down)' }}>✕</button>
                    </div>
                  );
                }
                return (
                  <div key={it.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 10px 17px',
                    borderBottom: '1px solid var(--line-soft)',
                    borderLeft: it.paid ? '3px solid transparent' : '3px solid var(--amber)',
                    background: it.paid ? 'transparent' : 'var(--amber-bg)',
                  }}>
                    <div style={{ minWidth: 44, fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--font-display)' }}>{brDate(it.entry_date).slice(0, 5)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.details || '—'}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                        {it.category}
                        {it.paid
                          ? <span style={{ color: 'var(--up)', fontWeight: 600 }}> · pago</span>
                          : <span style={{ color: 'var(--amber)', fontWeight: 700 }}> · a pagar</span>}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: entrada ? 'var(--up)' : 'var(--down)' }}>{entrada ? '+' : '−'}{fmt(it.amount)}</div>
                    <button onClick={() => reconferir(it)} title="editar valor" style={{ border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--ink-soft)' }}>✎</button>
                    <button onClick={() => togglePago(it)} title={it.paid ? 'marcar pendente' : 'marcar pago'} style={{
                      borderRadius: 7, padding: '4px 9px', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      border: it.paid ? 0 : '1px solid var(--amber)',
                      background: it.paid ? 'var(--up)' : 'var(--surface)',
                      color: it.paid ? '#fff' : 'var(--amber)',
                    }}>{it.paid ? '✓' : '○'}</button>
                    <button onClick={() => apagar(it)} title="apagar" style={{ border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontSize: 11, color: 'var(--down)' }}>✕</button>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* lateral: mês + pendentes */}
        <div>
          <section className="card" style={{ padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <b style={{ fontSize: 13 }}>Mês</b>
              <a href="/caixa/fixas" style={{ fontSize: 12, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 600 }}>contas fixas →</a>
            </div>
            {anos.map((a) => {
              const aberto = anosAbertos.has(a);
              return (
                <div key={a} style={{ marginBottom: 4 }}>
                  <button onClick={() => toggleAno(a)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-faint)', letterSpacing: '.03em', padding: '2px 2px 4px' }}>
                    <span style={{ transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform .2s', fontSize: 9 }}>▸</span>{a}
                  </button>
                  {aberto && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingBottom: 4 }}>
                      {porAno[a].map((m) => (
                        <button key={m} ref={m === mes ? activeRef : null} onClick={() => setMes(m)} style={{
                          padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', whiteSpace: 'nowrap',
                          fontSize: 12, fontWeight: 600, textTransform: 'capitalize',
                          background: m === mes ? 'var(--forest)' : 'var(--surface)', color: m === mes ? '#fff' : 'var(--ink-soft)',
                        }}>{MESES[Number(m.slice(5, 7)) - 1]}</button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {atual.saidasPend > 0 && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Saídas a pagar</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--down)' }}>{fmt(atual.saidasPend)}</div>
            </div>
          )}
          {atual.entradasPend > 0 && (
            <div className="card" style={{ padding: '12px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>Entradas a receber</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--up)' }}>{fmt(atual.entradasPend)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
