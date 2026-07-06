'use client';
import { useState } from 'react';

const fmt = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function PorAtivo({ ativos }) {
  const [periodo, setPeriodo] = useState('all'); // 'all' | '12m'

  const linhas = ativos
    .map((a) => ({ ...a, total: periodo === 'all' ? a.totalAll : a.total12m }))
    .filter((a) => a.total > 0)
    .sort((a, b) => b.total - a.total);
  const totalGeral = linhas.reduce((s, a) => s + a.total, 0);

  if (ativos.length === 0) {
    return (
      <section className="card" style={{ marginTop: 16, padding: 18, fontSize: 13, color: 'var(--ink-faint)' }}>
        Ainda não há proventos recebidos por ativo pra mostrar.
      </section>
    );
  }

  const btn = (val, label) => (
    <button onClick={() => setPeriodo(val)} style={{
      padding: '6px 11px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer', fontSize: 12, fontWeight: 600,
      background: periodo === val ? 'var(--forest)' : 'var(--surface)', color: periodo === val ? '#fff' : 'var(--ink-soft)',
    }}>{label}</button>
  );

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h2>Por ativo</h2>
        <div style={{ display: 'flex', gap: 6 }}>{btn('all', 'Todo período')}{btn('12m', '12 meses')}</div>
      </div>
      <div style={{ padding: '6px 20px 4px', fontSize: 12, color: 'var(--ink-faint)' }}>
        total recebido: <b style={{ fontFamily: 'var(--font-display)', color: 'var(--up)' }}>{fmt(totalGeral)}</b>
      </div>
      <div style={{ padding: '4px 0 8px' }}>
        {linhas.map((a) => {
          const yld = a.custo ? a.total / a.custo : null;
          return (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 20px', borderBottom: '1px solid var(--line-soft)' }}>
              <b style={{ fontFamily: 'var(--font-display)', minWidth: 62 }}>{a.ticker}</b>
              <span style={{ fontSize: 9, fontWeight: 700, color: a.fii ? 'var(--brass)' : 'var(--forest-2)', background: a.fii ? 'var(--brass-bg)' : 'var(--up-bg)', borderRadius: 4, padding: '1px 6px' }}>{a.fii ? 'FII' : 'AÇÃO'}</span>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--up)' }}>{fmt(a.total)}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                  {yld != null ? `yield ${(yld * 100).toFixed(1)}% do custo` : 'sem custo p/ yield'}
                </div>
              </div>
            </div>
          );
        })}
        {linhas.length === 0 && <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>Nada recebido neste período.</div>}
      </div>
    </section>
  );
}
