'use client';
import { useState } from 'react';

const brl = (n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const rotulo = (ym) => { const [a, m] = ym.split('-'); return `${MESES[Number(m) - 1]}/${a}`; };
const diaBR = (iso) => (iso || '').split('-').reverse().slice(0, 2).join('/');
const LIMITE_ISENCAO = 20000;

const CAT = { acao: 'ação', bdr: 'BDR', etf: 'ETF', fii: 'FII' };

export default function ApuracaoLista({ meses, pagos = {} }) {
  const [aberto, setAberto] = useState(meses[0]?.mes || null);
  const [salvando, setSalvando] = useState(null);

  async function alternarPago(mes, valor, jaPago) {
    setSalvando(mes);
    await fetch('/api/darf-payment', {
      method: jaPago ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mes, valor }),
    });
    window.location.reload();
  }

  if (!meses.length) {
    return <section className="card" style={{ padding: 20, fontSize: 13, color: 'var(--ink-faint)' }}>Nenhuma venda registrada ainda.</section>;
  }

  // saldo de prejuízo a compensar: cresce em meses negativos, é CONSUMIDO nos positivos
  const cron = [...meses].sort((a, b) => a.mes.localeCompare(b.mes));
  let saldoRV = 0, saldoFii = 0;   // prejuízo disponível (positivo = tem a usar)
  const acumulado = {};
  cron.forEach((m) => {
    const isentoAcao = m.vendasAcao > 0 && m.vendasAcao <= LIMITE_ISENCAO;
    // vendas de ação isentas não entram na compensação
    const rvMes = (isentoAcao ? 0 : m.resAcao) + m.resBdrEtf;

    let tribRV = 0;
    if (rvMes >= 0) { tribRV = Math.max(0, rvMes - saldoRV); saldoRV = Math.max(0, saldoRV - rvMes); }
    else { saldoRV += -rvMes; }

    let tribFii = 0;
    if (m.resFii >= 0) { tribFii = Math.max(0, m.resFii - saldoFii); saldoFii = Math.max(0, saldoFii - m.resFii); }
    else { saldoFii += -m.resFii; }

    acumulado[m.mes] = {
      rv: saldoRV, fii: saldoFii, rvMes, isentoAcao,
      impostoRV: tribRV * 0.15,
      impostoFii: tribFii * 0.20,
    };
  });

  const ultimo = acumulado[cron[cron.length - 1].mes];
  const impostoTotal = cron.reduce((s, m) => s + acumulado[m.mes].impostoRV + acumulado[m.mes].impostoFii, 0);

  // REGRA DOS R$10: imposto menor que R$10 não vira DARF no mês — acumula
  // e é somado aos meses seguintes até atingir R$10.
  const MINIMO_DARF = 10;
  const darfs = [];
  let saldo = 0;
  let contribuintes = [];
  cron.forEach((m) => {
    const imp = acumulado[m.mes].impostoRV + acumulado[m.mes].impostoFii;
    if (imp > 0) { saldo += imp; contribuintes.push({ mes: m.mes, valor: imp }); }
    if (saldo >= MINIMO_DARF) {
      darfs.push({ mesApuracao: m.mes, valor: saldo, meses: contribuintes });
      saldo = 0;
      contribuintes = [];
    }
  });
  const pendente = { valor: saldo, meses: contribuintes };

  const hojeISO = new Date().toISOString().slice(0, 10);
  function vencimentoDe(ym) {
    const [a, mm] = ym.split('-').map(Number);
    const d = new Date(a, mm + 1, 0); // dia 0 do mês+2 = último dia do mês seguinte
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { iso, br: iso.split('-').reverse().join('/') };
  }
  const darfsComVenc = darfs.map((d) => {
    const v = vencimentoDe(d.mesApuracao);
    const pagoEm = pagos[d.mesApuracao] || null;
    return { ...d, venc: v, pagoEm, vencido: !pagoEm && v.iso < hojeISO };
  });
  const totalAtrasado = darfsComVenc.filter((d) => d.vencido).reduce((s, d) => s + d.valor, 0);
  const totalPago = darfsComVenc.filter((d) => d.pagoEm).reduce((s, d) => s + d.valor, 0);

  return (
    <div>
      <section className="card" style={{ padding: '14px 18px', marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 8 }}>
          Acumulado desde o início
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>prejuízo a compensar · ações/BDRs/ETFs</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: ultimo.rv > 0 ? 'var(--up)' : 'var(--ink-faint)' }}>
              {brl(ultimo.rv)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
              {ultimo.rv > 0 ? 'disponível para abater ganhos futuros' : 'sem prejuízo acumulado'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>prejuízo a compensar · FIIs</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: ultimo.fii > 0 ? 'var(--up)' : 'var(--ink-faint)' }}>
              {brl(ultimo.fii)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>
              {ultimo.fii > 0 ? 'só abate ganho de FII' : 'sem prejuízo acumulado'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>imposto estimado (histórico)</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, color: impostoTotal > 0 ? 'var(--amber)' : 'var(--ink-faint)' }}>
              {brl(impostoTotal)}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>soma de todos os meses</div>
          </div>
        </div>
        <p style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 10, lineHeight: 1.5 }}>
          Conferência, não apuração oficial: não inclui corretagem/emolumentos, assume tudo swing trade
          e considera isenta a venda de ações até {brl(LIMITE_ISENCAO)}/mês. Confira com a corretora.
        </p>
      </section>

      <section className="card" style={{ marginBottom: 14 }}>
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8 }}>
          <h2>DARFs</h2>
          <span style={{ display: 'flex', gap: 10, fontSize: 12.5, fontWeight: 600 }}>
            {totalPago > 0 && <span style={{ color: 'var(--up)' }}>{brl(totalPago)} pago</span>}
            {totalAtrasado > 0 && <span style={{ color: 'var(--down)' }}>{brl(totalAtrasado)} em atraso</span>}
          </span>
        </div>

        <p style={{ fontSize: 11.5, color: 'var(--ink-faint)', margin: '4px 20px 8px', lineHeight: 1.5 }}>
          Imposto abaixo de {brl(MINIMO_DARF)} não vira DARF no mês: acumula e entra num mês seguinte.
          Abaixo, só os meses que realmente geram guia — código <b>6015</b>, vencimento no último dia útil do mês seguinte.
        </p>

        {darfsComVenc.length === 0 && (
          <div style={{ padding: '10px 20px 16px', fontSize: 13, color: 'var(--ink-faint)' }}>
            Nenhuma DARF gerada — o imposto acumulado nunca atingiu {brl(MINIMO_DARF)}.
          </div>
        )}

        {darfsComVenc.map((d, i) => (
          <div key={i} style={{
            padding: '10px 20px', borderBottom: '1px solid var(--line-soft)',
            borderLeft: '3px solid ' + (d.pagoEm ? 'var(--up)' : d.vencido ? 'var(--down)' : 'var(--amber)'),
            opacity: d.pagoEm ? 0.75 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <b style={{ fontSize: 13.5, textTransform: 'capitalize' }}>{rotulo(d.mesApuracao)}</b>
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}> · vence em {d.venc.br}</span>
                {d.pagoEm ? (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'var(--up)', borderRadius: 4, padding: '1px 6px', marginLeft: 6 }}>
                    PAGA {(d.pagoEm || '').split('-').reverse().join('/')}
                  </span>
                ) : d.vencido ? (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: 'var(--down)', borderRadius: 4, padding: '1px 6px', marginLeft: 6 }}>EM ATRASO</span>
                ) : null}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <b style={{ fontFamily: 'var(--font-display)', fontSize: 15, color: d.pagoEm ? 'var(--up)' : d.vencido ? 'var(--down)' : 'var(--amber)' }}>{brl(d.valor)}</b>
                <button onClick={() => alternarPago(d.mesApuracao, d.valor, !!d.pagoEm)} disabled={salvando === d.mesApuracao}
                  title={d.pagoEm ? 'desmarcar' : 'marcar como paga'}
                  style={{
                    fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 7, cursor: 'pointer',
                    border: '1px solid var(--line)', background: 'var(--surface)',
                    color: d.pagoEm ? 'var(--ink-faint)' : 'var(--forest-2)',
                  }}>{salvando === d.mesApuracao ? '…' : d.pagoEm ? 'desfazer' : '✓ paga'}</button>
              </div>
            </div>
            {d.meses.length > 1 && (
              <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 3 }}>
                acumulado de: {d.meses.map((x) => `${rotulo(x.mes)} ${brl(x.valor)}`).join(' + ')}
              </div>
            )}
          </div>
        ))}

        {pendente.valor > 0 && (
          <div style={{ padding: '10px 20px 16px', fontSize: 12, color: 'var(--ink-faint)' }}>
            Acumulado ainda sem guia: <b style={{ color: 'var(--ink)' }}>{brl(pendente.valor)}</b> — só vira DARF
            quando passar de {brl(MINIMO_DARF)}.
            {pendente.meses.length > 0 && (
              <div style={{ marginTop: 3 }}>
                de: {pendente.meses.map((x) => `${rotulo(x.mes)} ${brl(x.valor)}`).join(' + ')}
              </div>
            )}
          </div>
        )}

        <p style={{ fontSize: 10.5, color: 'var(--ink-faint)', margin: '8px 20px 14px', lineHeight: 1.5 }}>
          Os valores em atraso ainda recebem multa (0,33% ao dia, até 20%) e juros Selic, que não estão
          calculados aqui. Confirme com um contador antes de recolher.
        </p>
      </section>

      <section className="card">
        {meses.map((m) => {
          const exp = aberto === m.mes;
          const info = acumulado[m.mes];
          const totalVendas = m.vendasAcao + m.vendasBdrEtf + m.vendasFii;
          return (
            <div key={m.mes}>
              <button onClick={() => setAberto(exp ? null : m.mes)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 18px', cursor: 'pointer',
                border: 0, borderBottom: '1px solid var(--line-soft)', background: exp ? 'var(--surface-2)' : 'transparent', textAlign: 'left',
              }}>
                <span style={{ fontSize: 10, color: 'var(--ink-faint)', transform: exp ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▸</span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, textTransform: 'capitalize' }}>{rotulo(m.mes)}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 1 }}>
                    {m.vendas.length} venda(s) · {brl(totalVendas)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: info.rvMes >= 0 ? 'var(--up)' : 'var(--down)' }}>
                    {brl(info.rvMes)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>resultado do mês</div>
                </div>
              </button>

              {exp && (
                <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line-soft)', padding: '12px 18px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
                    <Bloco rot="vendas de ações" val={brl(m.vendasAcao)}
                      sub={m.vendasAcao === 0 ? '—' : (info.isentoAcao ? `isento (limite ${brl(LIMITE_ISENCAO)})` : 'acima do limite — tributável')}
                      cor={m.vendasAcao > 0 && info.isentoAcao ? 'var(--up)' : undefined} />
                    <Bloco rot="resultado ações" val={brl(m.resAcao)} cor={m.resAcao >= 0 ? 'var(--up)' : 'var(--down)'} />
                    <Bloco rot="resultado BDR/ETF" val={brl(m.resBdrEtf)} sub="sem isenção" cor={m.resBdrEtf >= 0 ? 'var(--up)' : 'var(--down)'} />
                    <Bloco rot="resultado FIIs" val={brl(m.resFii)} sub="apura separado (20%)" cor={m.resFii >= 0 ? 'var(--up)' : 'var(--down)'} />
                    <Bloco rot="imposto do mês" val={brl(info.impostoRV + info.impostoFii)}
                      sub={info.impostoRV + info.impostoFii > 0 ? 'DARF até o fim do mês seguinte' : 'sem imposto'}
                      cor={info.impostoRV + info.impostoFii > 0 ? 'var(--amber)' : 'var(--ink-faint)'} />
                    <Bloco rot="prejuízo restante" val={brl(info.rv)} sub="ações · BDRs · ETFs" />
                  </div>

                  <div style={{ maxHeight: 280, overflowY: 'auto', border: '1px solid var(--line-soft)', borderRadius: 8 }}>
                    {m.vendas.map((v, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 11.5, borderBottom: i < m.vendas.length - 1 ? '1px solid var(--line-soft)' : 0, flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-display)', minWidth: 44 }}>{diaBR(v.dia)}</span>
                        <b style={{ fontFamily: 'var(--font-display)', minWidth: 58 }}>{v.ticker}</b>
                        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--ink-faint)', border: '1px solid var(--line)', borderRadius: 4, padding: '0 5px' }}>{CAT[v.cat]}</span>
                        <span style={{ color: 'var(--ink-faint)', fontFamily: 'var(--font-display)' }}>
                          {v.qtd} × {brl(v.preco)} · PM {brl(v.pm)}
                        </span>
                        <b style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', color: v.resultado >= 0 ? 'var(--up)' : 'var(--down)' }}>
                          {v.resultado >= 0 ? '+' : ''}{brl(v.resultado)}
                        </b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

function Bloco({ rot, val, sub, cor }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{rot}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: cor || 'var(--ink)' }}>{val}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--ink-faint)' }}>{sub}</div>}
    </div>
  );
}
