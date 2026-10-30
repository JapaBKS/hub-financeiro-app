'use client';
import { useState } from 'react';
import { Campo } from '../ui/campos';
import { Botao } from '../ui/botoes';
import { brl } from '../../lib/format';

const META_PCT = 0.30; // meta: investir 30% do que recebe
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotulo = (ym) => `${MESES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(0, 4)}`;
const n = (v) => Number(v) || 0;
const texto = (x) => (n(x) ? String(x) : '');

// Recebido e investido do mês (você digita, dia 15 e dia 30), contra a meta de investir 30% do recebido.
export default function FluxoMensal({ linhas, mesAtual, tabelaOk }) {
  const porMes = Object.fromEntries(linhas.map((l) => [l.mes.slice(0, 7), l]));
  const preencher = (m) => {
    const l = porMes[m] || {};
    return { recebido_1: texto(l.recebido_1), recebido_2: texto(l.recebido_2), investido_1: texto(l.investido_1), investido_2: texto(l.investido_2) };
  };
  const [ym, setYm] = useState(mesAtual);
  const [v, setV] = useState(() => preencher(mesAtual));
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  function trocarMes(novo) { setYm(novo); setMsg(''); setEstado(null); setV(preencher(novo)); }
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  async function salvar() {
    setEstado('enviando'); setMsg('');
    const res = await fetch('/api/fluxo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mes: ym, ...v }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.ok) { window.location.reload(); return; }
    setEstado('erro'); setMsg(d.erro || 'Não foi possível salvar.');
  }

  const rec = n(v.recebido_1) + n(v.recebido_2);
  const inv = n(v.investido_1) + n(v.investido_2);
  const meta = rec * META_PCT;
  const falta = Math.max(0, meta - inv);
  const batida = rec > 0 && inv >= meta;
  const progresso = meta > 0 ? Math.min(1, inv / meta) : 0;

  const meses = [...new Set([...Object.keys(porMes), mesAtual])].sort().reverse().slice(0, 12);

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
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>meta: {Math.round(META_PCT * 100)}% do recebido</span>
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
          <span className="fluxo-rot">Investido</span>
          <Campo tamanho="sm" numerico largura="100%" type="number" step="any" min="0" placeholder="0,00" value={v.investido_1} onChange={set('investido_1')} />
          <Campo tamanho="sm" numerico largura="100%" type="number" step="any" min="0" placeholder="0,00" value={v.investido_2} onChange={set('investido_2')} />
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--ink-faint)', marginBottom: 6 }}>
            <span>Investido <b style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{brl(inv)}</b></span>
            <span>Meta <b style={{ color: 'var(--ink)', fontFamily: 'var(--font-display)' }}>{brl(meta)}</b></span>
          </div>
          <div style={{ height: 8, background: 'var(--track)', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ width: `${progresso * 100}%`, height: '100%', background: batida ? 'var(--up)' : 'var(--forest)' }} />
          </div>
          <p style={{ fontSize: 12.5, margin: '8px 0 0', fontWeight: 600, color: batida ? 'var(--up)' : 'var(--ink-soft)' }}>
            {rec <= 0 ? 'Informe o recebido para ver a meta.' : batida ? 'Meta do mês batida ✓' : `Faltam ${brl(falta)} para a meta`}
          </p>
        </div>

        <Botao variante="primario" tamanho="lg" cheio style={{ marginTop: 12 }} onClick={salvar} carregando={estado === 'enviando'}>
          Salvar {rotulo(ym)}
        </Botao>
        {msg && <p style={{ marginTop: 8, fontSize: 12.5, color: 'var(--down)' }}>{msg}</p>}
      </div>

      <div style={{ marginTop: 14 }}>
        <div className="fluxo-lista fluxo-lista-cab"><span>Mês</span><span>Recebido</span><span>Investido</span><span>%</span></div>
        {meses.map((m) => {
          const l = porMes[m] || {};
          const r = n(l.recebido_1) + n(l.recebido_2);
          const i = n(l.investido_1) + n(l.investido_2);
          const ok = r > 0 && i >= r * META_PCT;
          return (
            <button key={m} type="button" className="fluxo-lista fluxo-lista-linha" onClick={() => trocarMes(m)}
              style={{ background: m === ym ? 'var(--surface-2)' : 'transparent' }}>
              <span style={{ fontWeight: 600, textAlign: 'left' }}>{rotulo(m)}</span>
              <span>{r ? brl(r) : '—'}</span>
              <span>{i ? brl(i) : '—'}</span>
              <span style={{ color: ok ? 'var(--up)' : 'var(--ink-faint)', fontWeight: ok ? 700 : 400 }}>{r > 0 && i ? `${((i / r) * 100).toFixed(0)}%` : '—'}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
