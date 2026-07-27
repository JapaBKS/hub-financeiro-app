'use client';
import { useState } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const rotulo = (ym) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]} de ${a}`; };
const diaBR = (iso) => (iso || '').slice(0, 10).split('-').reverse().slice(0, 2).join('/');
const KIND = { dividendo: 'Dividendo', jcp: 'JCP', rendimento: 'Rendimento' };

export default function AReceber({ meses, total }) {
  const [abertos, setAbertos] = useState(() => new Set(meses.slice(0, 2).map((m) => m.mes)));

  if (!meses.length) {
    return (
      <section className="card" style={{ marginTop: 16, padding: 18, fontSize: 13, color: 'var(--ink-faint)' }}>
        Nenhum provento a receber cadastrado. Importe a aba “a receber” da B3 acima.
      </section>
    );
  }

  const toggle = (mes) => setAbertos((s) => { const n = new Set(s); n.has(mes) ? n.delete(mes) : n.add(mes); return n; });

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
        <h2>A receber</h2>
        <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>total <b style={{ fontFamily: 'var(--font-display)', color: 'var(--up)' }}>{fmt(total)}</b></span>
      </div>

      <div>
        {meses.map((m) => {
          const aberto = abertos.has(m.mes);
          return (
            <div key={m.mes}>
              <button onClick={() => toggle(m.mes)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 20px', cursor: 'pointer',
                border: 0, borderBottom: '1px solid var(--line-soft)', background: 'transparent', textAlign: 'left',
              }}>
                <span style={{ transform: aberto ? 'rotate(90deg)' : 'none', transition: 'transform .2s', fontSize: 10, color: 'var(--ink-faint)' }}>▸</span>
                <span style={{ fontSize: 13.5, fontWeight: 600, textTransform: 'capitalize' }}>{rotulo(m.mes)}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>· {m.itens.length} {m.itens.length === 1 ? 'provento' : 'proventos'}</span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--up)' }}>{fmt(m.total)}</span>
              </button>
              {aberto && (
                <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)' }}>
                  {m.itens.map((it, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 20px 8px 44px', fontSize: 12.5 }}>
                      <span style={{ minWidth: 42, color: 'var(--ink-faint)', fontSize: 11, fontFamily: 'var(--font-display)' }}>{diaBR(it.pay_date)}</span>
                      <b style={{ fontFamily: 'var(--font-display)', minWidth: 58 }}>{it.ticker}</b>
                      <span style={{ fontSize: 9.5, fontWeight: 700, color: it.fii ? 'var(--brass)' : 'var(--forest-2)', background: it.fii ? 'var(--brass-bg)' : 'var(--up-bg)', borderRadius: 4, padding: '1px 6px' }}>{KIND[it.kind] || it.kind}</span>
                      <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: 'var(--up)' }}>{fmt(it.amount)}</span>
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
