'use client';
import { useState, useMemo } from 'react';

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2).replace('.', ',')}%`;
const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '—');
const num = (n, casas = 0) => Number(n || 0).toLocaleString('pt-BR', { maximumFractionDigits: casas });

const inp = {
  padding: '10px 12px', borderRadius: 9, border: '1px solid var(--line)', fontSize: 14,
  fontFamily: 'var(--font-body)', boxSizing: 'border-box', background: 'var(--surface)', color: 'var(--ink)', width: '100%',
};

export default function BibliotecaLista({ ativos }) {
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [cat, setCat] = useState('todas');
  const [classe, setClasse] = useState('todas');
  const [aberto, setAberto] = useState(null);

  const lista = useMemo(() => {
    const q = busca.trim().toUpperCase();
    return ativos.filter((a) => {
      if (filtro === 'atuais' && !a.aberto) return false;
      if (filtro === 'encerrados' && a.aberto) return false;
      if (cat !== 'todas' && a.cat !== cat) return false;
      if (classe !== 'todas' && a.classe !== classe) return false;
      if (!q) return true;
      return a.ticker.includes(q) || (a.classe || '').toUpperCase().includes(q);
    });
  }, [ativos, busca, filtro, cat, classe]);

  const classesDisponiveis = useMemo(
    () => [...new Set(ativos.map((a) => a.classe).filter((c) => c && c !== '—'))].sort(),
    [ativos],
  );
  const contaCat = (c) => ativos.filter((a) => a.cat === c).length;
  const CATS = [
    ['todas', 'Todos os tipos'],
    ['acao', 'Ações'],
    ['bdr', 'BDRs'],
    ['fii', 'FIIs'],
    ['etf', 'ETFs'],
    ['cripto', 'Cripto'],
  ].filter(([v]) => v === 'todas' || contaCat(v) > 0);
  const temFiltro = busca || filtro !== 'todos' || cat !== 'todas' || classe !== 'todas';

  const totais = useMemo(() => ({
    investido: lista.reduce((s, a) => s + a.totalComprado, 0),
    dividendos: lista.reduce((s, a) => s + a.dividendos, 0),
    retorno: lista.reduce((s, a) => s + a.retorno, 0),
  }), [lista]);

  const btn = (val, label) => (
    <button onClick={() => setFiltro(val)} style={{
      padding: '7px 13px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
      border: '1px solid ' + (filtro === val ? 'var(--forest)' : 'var(--line)'),
      background: filtro === val ? 'var(--forest)' : 'var(--surface)',
      color: filtro === val ? '#fff' : 'var(--ink-soft)',
    }}>{label}</button>
  );

  return (
    <div>
      <section className="card" style={{ padding: 14, marginBottom: 14 }}>
        <input style={inp} value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar ticker ou classe (ex.: PETR4, FIIS)" />
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          {btn('todos', `Todos (${ativos.length})`)}
          {btn('atuais', `Na carteira (${ativos.filter((a) => a.aberto).length})`)}
          {btn('encerrados', `Encerrados (${ativos.filter((a) => !a.aberto).length})`)}
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
          {CATS.map(([val, rot]) => (
            <button key={val} onClick={() => setCat(val)} style={{
              padding: '6px 11px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
              border: '1px solid ' + (cat === val ? 'var(--forest-2)' : 'var(--line)'),
              background: cat === val ? 'var(--up-bg)' : 'var(--surface)',
              color: cat === val ? 'var(--forest-2)' : 'var(--ink-faint)',
            }}>{rot}{val !== 'todas' ? ` (${contaCat(val)})` : ''}</button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={classe} onChange={(e) => setClasse(e.target.value)} style={{
            ...inp, width: 'auto', minWidth: 150, padding: '7px 10px', fontSize: 12.5,
          }}>
            <option value="todas">Todas as classes</option>
            {classesDisponiveis.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {temFiltro && (
            <button onClick={() => { setBusca(''); setFiltro('todos'); setCat('todas'); setClasse('todas'); }} style={{
              padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
              border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink-faint)',
            }}>limpar filtros</button>
          )}
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', marginLeft: 'auto' }}>
            {lista.length} {lista.length === 1 ? 'ativo' : 'ativos'}
          </span>
        </div>
      </section>

      <section className="card" style={{ display: 'flex', gap: 10, padding: '12px 16px', marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 110 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>investido (compras)</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}>{brl(totais.investido)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 110 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>proventos</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--brass)' }}>{brl(totais.dividendos)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 110 }}>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>resultado</div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: totais.retorno >= 0 ? 'var(--up)' : 'var(--down)' }}>{brl(totais.retorno)}</div>
        </div>
      </section>

      <section className="card">
        {lista.map((a) => {
          const exp = aberto === a.ticker;
          return (
            <div key={a.ticker}>
              <button onClick={() => setAberto(exp ? null : a.ticker)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer',
                border: 0, borderBottom: '1px solid var(--line-soft)', background: exp ? 'var(--surface-2)' : 'transparent', textAlign: 'left',
                borderLeft: '3px solid ' + (a.aberto ? 'var(--forest-2)' : 'transparent'),
              }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap' }}>
                    <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{a.ticker}</b>
                    <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{a.classe}</span>
                    {!a.aberto && (
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.04em', color: 'var(--ink-faint)', border: '1px solid var(--line)', borderRadius: 4, padding: '1px 5px' }}>ENCERRADO</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2, fontFamily: 'var(--font-display)' }}>
                    {a.aberto
                      ? `${num(a.qtdAtual, 6)} × ${brl(a.precoRef)} · ${brl(a.valorAtual)}`
                      : `${dataBR(a.primeiraCompra)} → ${dataBR(a.ultimaVenda)}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13.5, color: a.retorno >= 0 ? 'var(--up)' : 'var(--down)' }}>
                    {brl(a.retorno)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{pct(a.retornoPct)}</div>
                </div>
                <span style={{ fontSize: 10, color: 'var(--ink-faint)', transform: exp ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▸</span>
              </button>

              {exp && (
                <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)', padding: '12px 16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 12 }}>
                    <Dado rot="comprado" val={brl(a.totalComprado)} sub={`${num(a.qtdComprada, 6)} cotas`} />
                    <Dado rot="vendido" val={brl(a.totalVendido)} sub={a.qtdVendida > 0 ? `${num(a.qtdVendida, 6)} cotas` : '—'} />
                    <Dado rot="proventos" val={brl(a.dividendos)} sub={`${a.nDividendos} pagamento(s)`} cor="var(--brass)" />
                    <Dado rot="preço médio" val={brl(a.pm)} sub={`${num(a.qtdComprada, 6)} cotas compradas`} />
                    {a.aberto && (
                      <Dado
                        rot="preço atual"
                        val={brl(a.precoRef)}
                        sub={
                          a.origemPreco === 'manual' ? 'informado por você'
                            : a.origemPreco === 'pm' ? 'sem cotação — usando o PM'
                            : a.origemPreco === 'auto-velho' ? `cotação de ${dataBR(a.precoEm)}`
                            : 'cotação atualizada'
                        }
                        cor={a.origemPreco === 'auto' ? 'var(--up)' : a.origemPreco === 'pm' ? 'var(--ink-faint)' : 'var(--amber)'}
                      />
                    )}
                    {a.aberto && <Dado rot="valor na carteira" val={brl(a.valorAtual)} sub={`${num(a.qtdAtual, 6)} cotas`} />}
                    <Dado rot="primeira compra" val={dataBR(a.primeiraCompra)} sub={`${a.nTrades} negociação(ões)`} />
                    <Dado rot={a.aberto ? 'última movimentação' : 'última venda'} val={dataBR(a.aberto ? a.ultimaMov : a.ultimaVenda)} />
                  </div>

                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginBottom: 6 }}>
                    {a.aberto
                      ? 'Resultado considera o valor de hoje + vendas + proventos − compras.'
                      : 'Resultado realizado: vendas + proventos − compras.'}
                  </div>

                  <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--line-soft)', borderRadius: 8 }}>
                    {a.movimentos.map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 12, borderBottom: i < a.movimentos.length - 1 ? '1px solid var(--line-soft)' : 0 }}>
                        <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-display)', minWidth: 68 }}>{dataBR(m.dia)}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, color: m.side === 'compra' ? 'var(--down)' : 'var(--up)', minWidth: 46 }}>
                          {m.side === 'compra' ? 'COMPRA' : 'VENDA'}
                        </span>
                        <span style={{ color: 'var(--ink-soft)', fontFamily: 'var(--font-display)' }}>{num(m.qtd, 6)} × {brl(m.preco)}</span>
                        <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', color: m.side === 'compra' ? 'var(--down)' : 'var(--up)' }}>
                          {m.side === 'compra' ? '−' : '+'}{brl(m.valor)}
                        </b>
                      </div>
                    ))}
                    {a.movimentos.length === 0 && (
                      <div style={{ padding: 10, fontSize: 12, color: 'var(--ink-faint)' }}>Sem negociações registradas (só proventos).</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {lista.length === 0 && (
          <div style={{ padding: 20, fontSize: 13, color: 'var(--ink-faint)' }}>Nenhum ativo encontrado.</div>
        )}
      </section>
    </div>
  );
}

function Dado({ rot, val, sub, cor }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{rot}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: cor || 'var(--ink)' }}>{val}</div>
      {sub && <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{sub}</div>}
    </div>
  );
}
