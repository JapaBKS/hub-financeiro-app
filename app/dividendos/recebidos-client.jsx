'use client';
import { useState } from 'react';

const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotulo = (ym) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]}/${a}`; };
const KIND = { dividendo: 'Dividendo', jcp: 'JCP', rendimento: 'Rendimento' };

export default function RecebidosMes({ meses }) {
  const [aberto, setAberto] = useState(null);

  if (!meses.length) {
    return (
      <section className="card" style={{ marginTop: 16, padding: 18, fontSize: 13, color: 'var(--ink-faint)' }}>
        Nenhum provento recebido registrado ainda. Eles aparecem aqui conforme as datas vão passando.
      </section>
    );
  }

  // total geral por ano (cabeçalho ao trocar de ano)
  let anoAnterior = null;

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-h"><h2>Recebidos por mês</h2></div>
      <div style={{ marginTop: 4 }}>
        {meses.map((m) => {
          const ano = m.mes.slice(0, 4);
          const novoAno = ano !== anoAnterior;
          anoAnterior = ano;
          const aberta = aberto === m.mes;
          return (
            <div key={m.mes}>
              {novoAno && (
                <div style={{ padding: '8px 20px 4px', fontSize: 11, fontWeight: 700, letterSpacing: '.05em', color: 'var(--ink-faint)' }}>{ano}</div>
              )}
              <button onClick={() => setAberto(aberta ? null : m.mes)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px',
                borderBottom: '1px solid var(--line-soft)', background: 'transparent', border: 0, cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)', transform: aberta ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▸</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, textTransform: 'capitalize' }}>{rotulo(m.mes)}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                  ações {fmt(m.acoes)} · fiis {fmt(m.fiis)}
                </span>
                <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--up)' }}>{fmt(m.total)}</b>
              </button>

              {aberta && (
                <div style={{ background: '#FAFBF9', borderBottom: '1px solid var(--line-soft)' }}>
                  {m.itens.map((it, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 20px 7px 38px', fontSize: 12.5 }}>
                      <b style={{ fontFamily: 'var(--font-display)' }}>{it.ticker}</b>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: it.fii ? 'var(--brass)' : 'var(--forest-2)', background: it.fii ? 'var(--brass-bg, #F3ECD9)' : 'var(--up-bg)', borderRadius: 4, padding: '1px 6px' }}>{it.fii ? 'FII' : 'AÇÃO'}</span>
                      <span style={{ color: 'var(--ink-faint)' }}>{KIND[it.kind] || it.kind}</span>
                      <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>{(it.paid_at || '').split('-').reverse().join('/')}</span>
                      <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{fmt(it.amount)}</b>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
