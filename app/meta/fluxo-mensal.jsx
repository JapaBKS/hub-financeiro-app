'use client';
import { useState } from 'react';
import { Campo } from '../ui/campos';
import { Botao } from '../ui/botoes';
import { brl } from '../../lib/format';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotulo = (ym) => `${MESES[Number(ym.slice(5, 7)) - 1]}/${ym.slice(0, 4)}`;
const n = (v) => Number(v) || 0;

// Recebido x investido por mês, em duas quinzenas (dia 15 e dia 30).
export default function FluxoMensal({ linhas, mesAtual, aportePlanejado, tabelaOk }) {
  const porMes = Object.fromEntries(linhas.map((l) => [l.mes.slice(0, 7), l]));
  const [ym, setYm] = useState(mesAtual);
  const ini = porMes[ym] || {};
  const [v, setV] = useState({
    recebido_1: ini.recebido_1 ? String(ini.recebido_1) : '', recebido_2: ini.recebido_2 ? String(ini.recebido_2) : '',
    investido_1: ini.investido_1 ? String(ini.investido_1) : '', investido_2: ini.investido_2 ? String(ini.investido_2) : '',
  });
  const [estado, setEstado] = useState(null);
  const [msg, setMsg] = useState('');

  function trocarMes(novo) {
    setYm(novo); setMsg(''); setEstado(null);
    const l = porMes[novo] || {};
    setV({
      recebido_1: l.recebido_1 ? String(l.recebido_1) : '', recebido_2: l.recebido_2 ? String(l.recebido_2) : '',
      investido_1: l.investido_1 ? String(l.investido_1) : '', investido_2: l.investido_2 ? String(l.investido_2) : '',
    });
  }
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

  const totRec = n(v.recebido_1) + n(v.recebido_2);
  const totInv = n(v.investido_1) + n(v.investido_2);

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
          <span className="fluxo-rot">Investido</span>
          <Campo tamanho="sm" numerico largura="100%" type="number" step="any" min="0" placeholder="0,00" value={v.investido_1} onChange={set('investido_1')} />
          <Campo tamanho="sm" numerico largura="100%" type="number" step="any" min="0" placeholder="0,00" value={v.investido_2} onChange={set('investido_2')} />
        </div>

        <div className="fluxo-resumo">
          <span>Recebido <b>{brl(totRec)}</b></span>
          <span>Investido <b>{brl(totInv)}</b></span>
          <span>{totRec > 0 ? `${((totInv / totRec) * 100).toFixed(0)}% do recebido` : '—'}</span>
        </div>

        <Botao variante="primario" tamanho="lg" cheio style={{ marginTop: 12 }} onClick={salvar} carregando={estado === 'enviando'}>
          Salvar {rotulo(ym)}
        </Botao>
        {msg && <p style={{ marginTop: 8, fontSize: 12.5, color: 'var(--down)' }}>{msg}</p>}
      </div>

      {linhas.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div className="fluxo-lista fluxo-lista-cab"><span>Mês</span><span>Recebido</span><span>Investido</span><span>%</span></div>
          {linhas.slice(0, 12).map((l) => {
            const rec = n(l.recebido_1) + n(l.recebido_2);
            const inv = n(l.investido_1) + n(l.investido_2);
            const ok = aportePlanejado > 0 && inv >= aportePlanejado;
            return (
              <button key={l.mes} type="button" className="fluxo-lista fluxo-lista-linha" onClick={() => trocarMes(l.mes.slice(0, 7))}
                style={{ background: l.mes.slice(0, 7) === ym ? 'var(--surface-2)' : 'transparent' }}>
                <span style={{ fontWeight: 600, textAlign: 'left' }}>{rotulo(l.mes.slice(0, 7))}</span>
                <span>{brl(rec)}</span>
                <span style={{ color: ok ? 'var(--up)' : 'inherit' }}>{brl(inv)}</span>
                <span style={{ color: 'var(--ink-faint)' }}>{rec > 0 ? `${((inv / rec) * 100).toFixed(0)}%` : '—'}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
