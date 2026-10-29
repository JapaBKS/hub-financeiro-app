'use client';
import { useState } from 'react';
import { Campo } from '../ui/campos';
import { Botao } from '../ui/botoes';
import { brl } from '../../lib/format';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotulo = (ym) => `${MESES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(0, 4)}`;
const n = (v) => Number(v) || 0;
const VAZIO = { compra_1: 0, compra_2: 0, venda_1: 0, venda_2: 0 };

// Recebido (você digita) x investido (calculado das compras registradas em Negociações), por
// quinzena: dia 15 = compras até o dia 15; dia 30 = compras depois. As vendas aparecem à parte
// para você descontar quando quiser; o "investido" aqui ainda é o valor BRUTO de compras.
export default function FluxoMensal({ linhas, trades, mesAtual, aportePlanejado, tabelaOk }) {
  const porMes = Object.fromEntries(linhas.map((l) => [l.mes.slice(0, 7), l]));
  const [ym, setYm] = useState(mesAtual);
  const preencher = (m) => {
    const l = porMes[m] || {};
    return { recebido_1: l.recebido_1 ? String(l.recebido_1) : '', recebido_2: l.recebido_2 ? String(l.recebido_2) : '' };
  };
  const [v, setV] = useState(() => preencher(mesAtual));
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  const t = trades[ym] || VAZIO;

  function trocarMes(novo) { setYm(novo); setMsg(''); setEstado(null); setV(preencher(novo)); }
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  async function salvar() {
    setEstado('enviando'); setMsg('');
    const atual = porMes[ym] || {};
    const res = await fetch('/api/fluxo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      // mantém o que já estava gravado nas colunas "investido" (não são mais usadas aqui)
      body: JSON.stringify({ mes: ym, ...v, investido_1: atual.investido_1 || 0, investido_2: atual.investido_2 || 0 }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.ok) { window.location.reload(); return; }
    setEstado('erro'); setMsg(d.erro || 'Não foi possível salvar.');
  }

  const totRec = n(v.recebido_1) + n(v.recebido_2);
  const totCompra = t.compra_1 + t.compra_2;
  const totVenda = t.venda_1 + t.venda_2;

  // meses da lista: os que têm recebido gravado ou negociação, do mais novo para o mais antigo
  const meses = [...new Set([...Object.keys(porMes), ...Object.keys(trades), mesAtual])].sort().reverse().slice(0, 12);

  if (!tabelaOk) {
    return (
      <section className="card" style={{ marginBottom: 16, padding: '16px 20px' }}>
        <div className="card-h" style={{ padding: 0 }}><h2>Recebido e investido</h2></div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 8 }}>
          A tabela <b>fluxo_mensal</b> ainda não existe no Supabase. Rode o SQL que enviei no chat e recarregue.
        </p>
      </section>
    );
  }

  return (
    <section className="card" style={{ marginBottom: 16, padding: '4px 0 16px' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Recebido e investido</h2>
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>aporte planejado {brl(aportePlanejado)}/mês</span>
      </div>

      <div style={{ padding: '4px 20px 0' }}>
        <div className="fluxo-mes">
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>Mês</label>
          <Campo tamanho="sm" type="month" value={ym} onChange={(e) => e.target.value && trocarMes(e.target.value)} />
        </div>

        <div className="fluxo-grade">
          <span />
          <span className="fluxo-cab">Dia 15</span>
          <span className="fluxo-cab">Dia 30</span>
          <span className="fluxo-rot">Recebido</span>
          <Campo tamanho="sm" numerico largura="100%" type="number" step="any" min="0" placeholder="0,00" value={v.recebido_1} onChange={set('recebido_1')} />
          <Campo tamanho="sm" numerico largura="100%" type="number" step="any" min="0" placeholder="0,00" value={v.recebido_2} onChange={set('recebido_2')} />
          <span className="fluxo-rot">Compras</span>
          <span className="fluxo-calc">{brl(t.compra_1)}</span>
          <span className="fluxo-calc">{brl(t.compra_2)}</span>
          <span className="fluxo-rot" style={{ color: 'var(--ink-faint)', fontWeight: 500 }}>Vendas</span>
          <span className="fluxo-calc" style={{ color: 'var(--ink-faint)' }}>{brl(t.venda_1)}</span>
          <span className="fluxo-calc" style={{ color: 'var(--ink-faint)' }}>{brl(t.venda_2)}</span>
        </div>

        <div className="fluxo-resumo">
          <span>Recebido <b>{brl(totRec)}</b></span>
          <span>Investido (compras) <b>{brl(totCompra)}</b></span>
          <span>{totRec > 0 ? `${((totCompra / totRec) * 100).toFixed(0)}% do recebido` : '—'}</span>
        </div>
        <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: '8px 0 0' }}>
          Compras vêm das Negociações (até o dia 15 / depois). Vendas do mês: {brl(totVenda)} — ainda não descontadas.
        </p>

        <Botao variante="primario" tamanho="lg" cheio style={{ marginTop: 12 }} onClick={salvar} carregando={estado === 'enviando'}>
          Salvar recebido de {rotulo(ym)}
        </Botao>
        {msg && <p style={{ marginTop: 8, fontSize: 12.5, color: 'var(--down)' }}>{msg}</p>}
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="fluxo-lista fluxo-lista-cab"><span>Mês</span><span>Recebido</span><span>Compras</span><span>%</span></div>
        {meses.map((m) => {
          const l = porMes[m] || {};
          const tr = trades[m] || VAZIO;
          const rec = n(l.recebido_1) + n(l.recebido_2);
          const inv = tr.compra_1 + tr.compra_2;
          const ok = aportePlanejado > 0 && inv >= aportePlanejado;
          return (
            <button key={m} type="button" className="fluxo-lista fluxo-lista-linha" onClick={() => trocarMes(m)}
              style={{ background: m === ym ? 'var(--surface-2)' : 'transparent' }}>
              <span style={{ fontWeight: 600, textAlign: 'left' }}>{rotulo(m)}</span>
              <span>{rec ? brl(rec) : '—'}</span>
              <span style={{ color: ok ? 'var(--up)' : 'inherit' }}>{brl(inv)}</span>
              <span style={{ color: 'var(--ink-faint)' }}>{rec > 0 ? `${((inv / rec) * 100).toFixed(0)}%` : '—'}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
