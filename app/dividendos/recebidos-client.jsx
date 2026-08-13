'use client';
import { useState } from 'react';
import { brl as fmt } from '../../lib/format';
import { Botao } from '../ui/botoes';
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotulo = (ym) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]}/${a}`; };
const KIND = { dividendo: 'Dividendo', jcp: 'JCP', rendimento: 'Rendimento' };

export default function RecebidosMes({ meses }) {
  const [apagando, setApagando] = useState(null);

  async function excluir(corpo, confirmacao, chave) {
    if (!window.confirm(confirmacao)) return;
    setApagando(chave);
    const res = await fetch('/api/dividends-delete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
    });
    if (res.ok) { window.location.reload(); return; }
    setApagando(null);
    const d = await res.json().catch(() => ({}));
    window.alert(d.erro || 'Não foi possível excluir.');
  }

  const excluirItem = (it) => excluir(
    { id: it.id },
    `Excluir ${it.ticker} de ${fmt(it.amount)}?`,
    `item-${it.id}`,
  );

  const limparMes = (m) => excluir(
    { month: m.mes },
    `Limpar TODOS os proventos de ${rotulo(m.mes)}? Apaga ${m.itens.length} lançamento(s). Use para reimportar da B3.`,
    `mes-${m.mes}`,
  );

  // agrupa por ano (meses já vêm em ordem decrescente)
  const anos = [];
  const porAno = {};
  meses.forEach((m) => {
    const ano = m.mes.slice(0, 4);
    if (!porAno[ano]) { porAno[ano] = { ano, meses: [], total: 0, acoes: 0, fiis: 0, temRecebido: false }; anos.push(porAno[ano]); }
    porAno[ano].meses.push(m);
    porAno[ano].total += m.total;
    porAno[ano].acoes += m.acoes;
    porAno[ano].fiis += m.fiis;
    if (!m.futuro) porAno[ano].temRecebido = true;
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
                <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: y.temRecebido ? 'var(--up)' : 'var(--amber)' }}>{fmt(y.total)}</b>
              </button>

              {anoAberto && y.meses.map((m) => {
                const aberta = mesAberto === m.mes;
                const ehAtual = m.mes === mesAtualKey;
                return (
                  <div key={m.mes}>
                    <button onClick={() => setMesAberto(aberta ? null : m.mes)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 10px 30px',
                      borderBottom: '1px solid var(--line-soft)', border: 0, cursor: 'pointer', textAlign: 'left',
                      borderLeft: m.futuro ? '3px solid var(--amber)' : ehAtual ? '3px solid var(--forest)' : '3px solid transparent',
                      background: m.futuro ? 'var(--amber-bg)' : ehAtual ? 'var(--up-bg)' : 'transparent',
                      opacity: m.futuro ? 0.92 : 1,
                    }}>
                      <span style={{ fontSize: 10, color: 'var(--ink-faint)', transform: aberta ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▸</span>
                      <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize', color: m.futuro ? 'var(--amber)' : ehAtual ? 'var(--forest-2)' : 'inherit' }}>{rotulo(m.mes)}</span>
                      {m.futuro ? (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: '#fff', background: 'var(--amber)', borderRadius: 4, padding: '1px 6px' }}>A RECEBER</span>
                      ) : ehAtual ? (
                        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: '#fff', background: 'var(--forest)', borderRadius: 4, padding: '1px 6px' }}>ESTE MÊS</span>
                      ) : null}
                      <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>ações {fmt(m.acoes)} · fiis {fmt(m.fiis)}</span>
                      <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: m.futuro ? 'var(--amber)' : 'var(--up)' }}>{fmt(m.total)}</b>
                    </button>

                    {aberta && (
                      <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)' }}>
                        {!m.futuro && (
                          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 20px 2px' }}>
                            <Botao variante="perigo" tamanho="sm"
                              onClick={() => limparMes(m)}
                              carregando={apagando === `mes-${m.mes}`}
                              title="apagar tudo deste mês para reimportar da B3">
                              limpar mês (reimportar B3)
                            </Botao>
                          </div>
                        )}
                        {m.itens.map((it, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 20px 7px 48px', fontSize: 12.5 }}>
                            <b style={{ fontFamily: 'var(--font-display)' }}>{it.ticker}</b>
                            <span style={{ fontSize: 9.5, fontWeight: 700, color: it.fii ? 'var(--brass)' : 'var(--forest-2)', background: it.fii ? 'var(--brass-bg, #F3ECD9)' : 'var(--up-bg)', borderRadius: 4, padding: '1px 6px' }}>{it.fii ? 'FII' : 'AÇÃO'}</span>
                            <span style={{ color: 'var(--ink-faint)' }}>{KIND[it.kind] || it.kind}</span>
                            <span style={{ color: 'var(--ink-faint)', fontSize: 11 }}>{((it.paid_at || it.pay_date) || '').split('-').reverse().slice(0, 2).join('/')}</span>
                            <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{fmt(it.amount)}</b>
                            {!m.futuro && it.id != null && (
                              <Botao variante="perigo" tamanho="sm"
                                onClick={() => excluirItem(it)}
                                carregando={apagando === `item-${it.id}`}
                                title="excluir este provento">✕</Botao>
                            )}
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
