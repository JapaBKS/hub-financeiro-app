'use client';
import { useState } from 'react';

const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotulo = (ym) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]}/${a}`; };
const KIND = { dividendo: 'Dividendo', jcp: 'JCP', rendimento: 'Rendimento' };

export default function RecebidosMes({ meses }) {
  async function excluirItem(it) {
    const dia = (it.paid_at || '').split('-').reverse().join('/');
    if (!window.confirm(`Excluir ${it.ticker} (${dia}) de ${fmt(it.amount)}?`)) return;
    const res = await fetch('/api/dividends-delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: it.id }),
    });
    if (res.ok) window.location.reload();
    else window.alert('Não foi possível excluir.');
  }
  async function limparMes(m) {
    if (!window.confirm(`Limpar TODOS os proventos de ${rotulo(m.mes)}? Apaga ${m.itens.length} lançamento(s). Use para reimportar da B3.`)) return;
    const res = await fetch('/api/dividends-delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ month: m.mes }),
    });
    if (res.ok) window.location.reload();
    else window.alert('Não foi possível limpar o mês.');
  }
  // agrupa por ano (meses já vêm em ordem decrescente)
  const anos = [];
  const porAno = {};
  meses.forEach((m) => {
    const ano = m.mes.slice(0, 4);
    if (!porAno[ano]) { porAno[ano] = { ano, meses: [], total: 0, acoes: 0, fiis: 0 }; anos.push(porAno[ano]); }
    porAno[ano].meses.push(m);
    porAno[ano].total += m.total;
    porAno[ano].acoes += m.acoes;
    porAno[ano].fiis += m.fiis;
  });

  const anoAtual = String(new Date().getFullYear());
  const mesAtualKey = `${anoAtual}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
  const [anosAbertos, setAnosAbertos] = useState(() => new Set([anoAtual]));
  const [mesAberto, setMesAberto] = useState(null);

  const toggleAno = (ano) => setAnosAbertos((s) => {
    const n = new Set(s);
    n.has(ano) ? n.delete(ano) : n.add(ano);
    return n;
  });

  if (!meses.length) {
    return (
      <section className="card" style={{ marginTop: 16, padding: 18, fontSize: 13, color: 'var(--ink-faint)' }}>
        Nenhum provento recebido registrado ainda. Eles aparecem aqui conforme as datas vão passando.
      </section>
    );
  }

  return (
    <section className="card" style={{ marginTop: 16 }}>
      <div className="card-h"><h2>Recebidos por mês</h2></div>
      <div style={{ marginTop: 4 }}>
        {anos.map((y) => {
          const anoAberto = anosAbertos.has(y.ano);
          return (
            <div key={y.ano}>
              <button onClick={() => toggleAno(y.ano)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px',
                borderBottom: '1px solid var(--line-soft)', background: 'var(--surface-2)', border: 0, cursor: 'pointer', textAlign: 'left',
              }}>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)', transform: anoAberto ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▸</span>
                <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.02em' }}>{y.ano}</span>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>ações {fmt(y.acoes)} · fiis {fmt(y.fiis)}</span>
                <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--up)' }}>{fmt(y.total)}</b>
              </button>

              {anoAberto && y.meses.map((m) => {
                const aberta = mesAberto === m.mes;
                const ehAtual = m.mes === mesAtualKey;
                return (
                  <div key={m.mes}>
                    <button onClick={() => setMesAberto(aberta ? null : m.mes)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 10px 30px',
                      borderBottom: '1px solid var(--line-soft)', border: 0, cursor: 'pointer', textAlign: 'left',
                      borderLeft: ehAtual ? '3px solid var(--forest)' : '3px solid transparent',
                      background: ehAtual ? 'var(--up-bg)' : 'transparent',
                    }}>
                      <span style={{ fontSize: 10, color: 'var(--ink-faint)', transform: aberta ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▸</span>
                      <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize', color: ehAtual ? 'var(--forest-2)' : 'inherit' }}>{rotulo(m.mes)}</span>
                      {ehAtual && (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: '#fff', background: 'var(--forest)', borderRadius: 4, padding: '1px 6px' }}>ESTE MÊS</span>
                      )}
                      <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>ações {fmt(m.acoes)} · fiis {fmt(m.fiis)}</span>
                      <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--up)' }}>{fmt(m.total)}</b>
                    </button>

                    {aberta && (
                      <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 20px 2px' }}>
                          <button onClick={() => limparMes(m)} title="apagar tudo deste mês para reimportar da B3" style={{
                            fontSize: 10.5, fontWeight: 600, color: 'var(--down)', background: 'transparent',
                            border: '1px solid var(--line)', borderRadius: 7, padding: '4px 9px', cursor: 'pointer',
                          }}>limpar mês (reimportar B3)</button>
                        </div>
                        {m.itens.map((it, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 20px 7px 48px', fontSize: 12.5 }}>
                            <b style={{ fontFamily: 'var(--font-display)' }}>{it.ticker}</b>
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: it.fii ? 'var(--brass)' : 'var(--forest-2)', background: it.fii ? 'var(--brass-bg, #F3ECD9)' : 'var(--up-bg)', borderRadius: 4, padding: '1px 6px' }}>{it.fii ? 'FII' : 'AÇÃO'}</span>
                            <span style={{ color: 'var(--ink-faint)' }}>{KIND[it.kind] || it.kind}</span>
                            <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>{(it.paid_at || '').split('-').reverse().join('/')}</span>
                            <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{fmt(it.amount)}</b>
                            <button onClick={() => excluirItem(it)} title="excluir este provento" style={{
                              border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: 6,
                              padding: '2px 7px', cursor: 'pointer', fontSize: 11, color: 'var(--down)',
                            }}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
}
