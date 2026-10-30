import HistoricoMensal from './historico-mensal';
import CalculadoraAporte from './calculadora-aporte';
import { supabaseServer } from '../../lib/supabase';
import { brl, brlShort, pct } from '../../lib/format';
import MetaForm from './meta-client';
import MetaChart from './meta-chart';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ymIndex = (s) => { const [y, m] = s.slice(0, 7).split('-').map(Number); return y * 12 + (m - 1); };
const idxLabel = (i) => `${String((i % 12) + 1).padStart(2, '0')}/${Math.floor(i / 12)}`;
const idxYear = (i) => Math.floor(i / 12);
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesLabel = (i) => `${MESES[i % 12]}/${Math.floor(i / 12)}`;
const ORDEM = ['Ações BR', 'Global', 'FIIS', 'BTC', 'PENDLE', 'SOLANA', 'Tesouro', 'Fundos de Investimentos', 'Reserva', 'Proventos'];
const CURTO = { 'Ações BR': 'Ações BR', 'Global': 'Global', 'FIIS': 'FIIs', 'BTC': 'BTC', 'PENDLE': 'PENDLE', 'SOLANA': 'SOLANA', 'Tesouro': 'Tesouro', 'Fundos de Investimentos': 'Fundos', 'Reserva': 'Reserva', 'Proventos': 'Prov.' };
const valor = (v) => (v ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—');

export default async function Meta() {
  const sb = supabaseServer();
  const [{ data: goal }, { data: snaps }, { data: alloc }, { data: classesAlvo }] = await Promise.all([
    sb.from('goal_config').select('*').eq('id', 1).maybeSingle(),
    sb.from('portfolio_snapshots').select('snapshot_month, value, asset_classes(name)'),
    sb.from('v_class_allocation').select('classe, valor'),
    sb.from('asset_classes').select('name, alvo_valor'),
  ]);

  const realNow = (alloc || []).reduce((s, c) => s + Number(c.valor), 0);

  // quanto falta para a reserva de emergência chegar no alvo (alvo em R$ cadastrado em Alvos)
  const NOME_RESERVA = 'Reserva de Emergência';
  const reservaAlvo = Number((classesAlvo || []).find((c) => c.name === NOME_RESERVA)?.alvo_valor) || 0;
  const reservaSaldo = Number((alloc || []).find((c) => c.classe === NOME_RESERVA)?.valor) || 0;
  const reservaFalta = Math.max(0, reservaAlvo - reservaSaldo);

  if (!goal) {
    return (
      <div className="wrap" style={{ maxWidth: 640 }}>
        <header className="topbar">
          <div className="brand"><div className="mark" /><div><b>Meta</b><span>projeção do patrimônio</span></div></div>
          <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
        </header>
        <div className="card" style={{ padding: 20, marginBottom: 16, fontSize: 13, color: 'var(--ink-soft)' }}>
          Defina sua meta para ver a projeção. Patrimônio atual: <b>{brl(realNow)}</b>.
        </div>
        <MetaForm goal={{ target_value: realNow * 2, monthly_contribution: 1000, assumed_annual_return: 0.1, started_at: new Date().toISOString().slice(0, 10), starting_value: realNow }} />
      </div>
    );
  }

  const hoje = new Date();
  const todayIdx = hoje.getUTCFullYear() * 12 + hoje.getUTCMonth();

  // ---- projeção personalizada ----
  // Começa jul/2024 com 8.200. Cada mês: saldo = saldo_ant × 1,01 + aporte(ano) + dividendos_mês_anterior.
  // dividendos = 0,5% do saldo do mês. Aporte: 1.000 em 2024, +10% a cada virada de ano. Vai até 1 milhão.
  const META = 1000000;
  const PROJ_INICIO = ymIndex('2024-07-01');
  const PROJ_SALDO0 = 8200;
  const CRESC_MES = 0.01;
  const DIV_PCT = 0.005;
  const APORTE_BASE = 1000;
  const APORTE_ANO0 = 2024;
  const APORTE_CRESC = 0.10;
  const aporteDoAno = (idx) => APORTE_BASE * Math.pow(1 + APORTE_CRESC, Math.floor(idx / 12) - APORTE_ANO0);

  const target = META;

  const proj = [];
  {
    let saldo = PROJ_SALDO0;
    let div = saldo * DIV_PCT;
    let idx = PROJ_INICIO;
    proj.push({ idx, value: saldo, aporte: 0, div });
    let g = 0;
    while (saldo < META && g < 1200) {
      idx++; g++;
      const ap = aporteDoAno(idx);
      saldo = saldo * (1 + CRESC_MES) + ap + div;
      div = saldo * DIV_PCT;
      proj.push({ idx, value: saldo, aporte: ap, div });
    }
  }
  const targetIdx = proj[proj.length - 1].idx;
  const projByIdx = {};
  proj.forEach((p) => { projByIdx[p.idx] = p.value; });
  const projAt = (idx) => {
    if (idx <= proj[0].idx) return proj[0].value;
    if (projByIdx[idx] != null) return projByIdx[idx];
    return proj[proj.length - 1].value;
  };
  const plannedNow = projAt(todayIdx);

  // roda a mesma fórmula a partir de um ponto qualquer até alcançar um alvo -> retorna o idx
  const alcancaIdx = (startVal, startIdx, alvo) => {
    if (startVal >= alvo) return startIdx;
    let saldo = startVal, div = saldo * DIV_PCT, idx = startIdx, g = 0;
    while (saldo < alvo && g < 1200) {
      idx++; g++;
      saldo = saldo * (1 + CRESC_MES) + aporteDoAno(idx) + div;
      div = saldo * DIV_PCT;
    }
    return idx;
  };
  const projAlcancaIdx = (alvo) => {
    const p = proj.find((x) => x.value >= alvo);
    return p ? p.idx : proj[proj.length - 1].idx;
  };

  // marcos: no seu ritmo (partindo de hoje) vs pela projeção pura
  const MARCOS = [100000, 500000, 1000000];
  const marcos = MARCOS.map((alvo) => ({
    alvo,
    atingido: realNow >= alvo,
    seuRitmo: alcancaIdx(realNow, todayIdx, alvo),
    pelaProj: projAlcancaIdx(alvo),
  }));

  // quantos meses à frente da projeção: onde a projeção alcançaria o seu valor de hoje
  const idxProjIgualHoje = projAlcancaIdx(realNow);
  const mesesAdiante = idxProjIgualHoje - todayIdx;

  // real (snapshots somados por mês) + ponto de hoje ao vivo
  const realMap = {};
  (snaps || []).forEach((s) => { const k = ymIndex(s.snapshot_month); realMap[k] = (realMap[k] || 0) + Number(s.value); });
  realMap[todayIdx] = realNow;
  const realPts = Object.entries(realMap).map(([k, val]) => ({ idx: Number(k), value: val })).sort((a, b) => a.idx - b.idx);

  // histórico mês a mês (mais recente primeiro) com variação vs mês anterior disponível
  const historico = realPts.map((p, n) => {
    const prev = n > 0 ? realPts[n - 1].value : null;
    return {
      idx: p.idx, value: p.value,
      deltaVal: prev != null ? p.value - prev : null,
      deltaPct: prev ? p.value / prev - 1 : null,
    };
  }).reverse();

  // composição por classe de cada mês (matriz mês × classe)
  const porMesClasse = {};
  (snaps || []).forEach((s) => {
    const k = ymIndex(s.snapshot_month);
    const nome = s.asset_classes?.name || '—';
    if (!porMesClasse[k]) porMesClasse[k] = {};
    porMesClasse[k][nome] = (porMesClasse[k][nome] || 0) + Number(s.value);
  });
  // mês atual ao vivo (composição real de agora)
  const allocClasse = {};
  (alloc || []).forEach((a) => { allocClasse[a.classe] = (allocClasse[a.classe] || 0) + Number(a.valor); });
  porMesClasse[todayIdx] = allocClasse;

  const presentes = new Set();
  Object.values(porMesClasse).forEach((o) => Object.keys(o).forEach((n) => { if ((o[n] || 0) > 0) presentes.add(n); }));
  const colunas = ORDEM.filter((n) => presentes.has(n));
  const mesesComp = Object.keys(porMesClasse).map(Number).sort((a, b) => b - a);

  // projeção atinge a meta (1mi)
  const forecastIdx = targetIdx;
  const mesesFalta = Math.max(0, forecastIdx - todayIdx);

  // tabela projetado vs real (do início da projeção até o mês atual)
  const compara = [];
  for (let k = PROJ_INICIO; k <= todayIdx; k++) {
    const projV = projByIdx[k];
    const realV = realMap[k];
    compara.push({ idx: k, proj: projV != null ? projV : null, real: realV != null ? realV : null });
  }
  compara.reverse();

  const falta = Math.max(0, target - realNow);
  const progresso = target > 0 ? realNow / target : 0;
  const ritmoDiff = realNow - plannedNow;
  const ritmoPct = plannedNow > 0 ? realNow / plannedNow - 1 : 0;
  const adiante = ritmoDiff >= 0;

  // ---- gráfico SVG ----
  const W = 700, H = 300, padL = 6, padR = 14, padT = 16, padB = 26;
  const minIdx = Math.min(PROJ_INICIO, realPts[0]?.idx ?? PROJ_INICIO);
  const maxIdx = Math.max(todayIdx, targetIdx);
  const maxY = Math.max(target, ...realPts.map((p) => p.value), ...proj.map((p) => p.value)) * 1.05;
  const px = (idx) => padL + ((idx - minIdx) / (maxIdx - minIdx || 1)) * (W - padL - padR);
  const py = (val) => padT + (1 - val / maxY) * (H - padT - padB);

  const projLine = proj.filter((p) => p.idx <= maxIdx).map((p) => `${px(p.idx).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ');
  const realLine = realPts.map((p) => `${px(p.idx).toFixed(1)},${py(p.value).toFixed(1)}`).join(' ');

  // marcas de ano no eixo X
  const anoIni = idxYear(minIdx), anoFim = idxYear(maxIdx);
  const passoAno = Math.max(1, Math.ceil((anoFim - anoIni) / 6));
  const anos = [];
  for (let a = anoIni; a <= anoFim; a += passoAno) anos.push(a);
  // grades horizontais
  const grades = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxY);

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="topbar">
        <div className="brand"><div className="mark" /><div><b>Meta</b><span>projeção do patrimônio</span></div></div>
        <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
      </header>

      {/* números de destaque */}
      <section className="card" style={{ padding: '20px 22px', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Patrimônio</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 26, letterSpacing: '-.02em' }}>{brl(realNow)}</div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Meta</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>{brl(target)}</div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>Falta</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 20 }}>{brl(falta)}</div>
          </div>
        </div>

        {/* barra de progresso */}
        <div style={{ marginTop: 16, height: 8, background: 'var(--track)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min(100, progresso * 100)}%`, height: '100%', background: 'var(--forest)' }} />
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>{pct(progresso)} da meta</div>

        {/* no ritmo? */}
        <div style={{
          marginTop: 16, padding: '12px 14px', borderRadius: 10,
          background: adiante ? 'var(--up-bg)' : 'var(--amber-bg)',
          border: `1px solid ${adiante ? 'var(--up)' : 'var(--amber)'}22`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: adiante ? 'var(--up)' : 'var(--amber)' }}>
            {adiante ? '✓ No ritmo — à frente do plano' : '⚠ Abaixo do ritmo do plano'}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 3 }}>
            Plano previa {brl(plannedNow)} para hoje · você tem {brl(realNow)} ({adiante ? '+' : ''}{brl(ritmoDiff)}, {adiante ? '+' : ''}{pct(ritmoPct)})
          </div>
          {mesesAdiante !== 0 && (
            <div style={{ fontSize: 12.5, fontWeight: 600, color: mesesAdiante > 0 ? 'var(--up)' : 'var(--amber)', marginTop: 2 }}>
              {mesesAdiante > 0
                ? `Você está ${mesesAdiante} ${mesesAdiante === 1 ? 'mês' : 'meses'} à frente da projeção`
                : `Você está ${-mesesAdiante} ${-mesesAdiante === 1 ? 'mês' : 'meses'} atrás da projeção`}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>
            Pela projeção, R$ 1 mi em <b>{mesLabel(forecastIdx)}</b> (~{Math.floor(mesesFalta / 12)}a {mesesFalta % 12}m)
          </div>
        </div>
      </section>

      {/* marcos */}
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><h2>Marcos</h2></div>
        <div style={{ padding: '4px 0 8px' }}>
          <div style={{ display: 'flex', padding: '6px 20px', fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, borderBottom: '1px solid var(--line)' }}>
            <span style={{ flex: 1 }}>Marco</span>
            <span style={{ flex: 1, textAlign: 'right' }}>No seu ritmo</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Pela projeção</span>
          </div>
          {marcos.map((m) => (
            <div key={m.alvo} style={{ display: 'flex', alignItems: 'center', padding: '9px 20px', fontSize: 13, borderBottom: '1px solid var(--line-soft)' }}>
              <span style={{ flex: 1, fontWeight: 600 }}>{brl(m.alvo)}</span>
              <span style={{ flex: 1, textAlign: 'right', fontWeight: 600, color: m.atingido ? 'var(--up)' : 'var(--forest-2)', textTransform: 'capitalize' }}>
                {m.atingido ? '✓ atingido' : mesLabel(m.seuRitmo)}
              </span>
              <span style={{ flex: 1, textAlign: 'right', color: 'var(--brass)', textTransform: 'capitalize' }}>
                {mesLabel(m.pelaProj)}
              </span>
            </div>
          ))}
        </div>
        <p style={{ padding: '2px 20px 0', fontSize: 11, color: 'var(--ink-faint)' }}>
          "No seu ritmo" parte do seu valor de hoje seguindo a mesma fórmula. "Pela projeção" é o plano puro desde jul/2024.
        </p>
      </section>

      {/* gráfico */}
      <MetaChart proj={proj} realPts={realPts} target={target} todayIdx={todayIdx} realNow={realNow} />

      {/* regra dos 30%: calculadora */}
      <CalculadoraAporte reservaFalta={reservaFalta} />

      {/* projetado vs real */}
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><h2>Projetado vs real</h2></div>
        <div style={{ padding: '4px 0 8px' }}>
          <div style={{ display: 'flex', padding: '6px 20px', fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, borderBottom: '1px solid var(--line)' }}>
            <span style={{ minWidth: 78 }}>Mês</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Projetado</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Real</span>
            <span style={{ flex: 1, textAlign: 'right' }}>Diferença</span>
          </div>
          {compara.map((c, n) => {
            const diff = c.real != null && c.proj != null ? c.real - c.proj : null;
            const atual = c.idx === todayIdx;
            return (
              <div key={c.idx} style={{
                display: 'flex', alignItems: 'center', padding: '7px 20px', fontSize: 12.5,
                borderBottom: '1px solid var(--line-soft)',
                background: atual ? 'var(--up-bg)' : n % 2 ? 'var(--surface-2)' : 'transparent',
              }}>
                <span style={{ minWidth: 78, fontWeight: 600, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>{mesLabel(c.idx)}{atual ? ' •' : ''}</span>
                <span style={{ flex: 1, textAlign: 'right', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: 'var(--brass)' }}>{c.proj != null ? valor(c.proj) : '—'}</span>
                <span style={{ flex: 1, textAlign: 'right', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums' }}>{c.real != null ? valor(c.real) : '—'}</span>
                <span style={{ flex: 1, textAlign: 'right', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: diff == null ? 'var(--ink-faint)' : diff >= 0 ? 'var(--up)' : 'var(--down)' }}>
                  {diff == null ? '—' : `${diff >= 0 ? '+' : '−'}${valor(Math.abs(diff))}`}
                </span>
              </div>
            );
          })}
        </div>
        <p style={{ padding: '2px 20px 0', fontSize: 11, color: 'var(--ink-faint)' }}>Valores em R$, arredondados. Diferença = real − projetado (verde = acima do plano).</p>
      </section>

      {/* histórico mensal */}
      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><h2>Histórico mensal</h2></div>
        {historico.length <= 1 ? (
          <p style={{ padding: '4px 20px 16px', fontSize: 12.5, color: 'var(--ink-faint)' }}>
            O histórico começa a se preencher conforme os meses passam (uma foto por mês). Por enquanto só há o mês atual — volte no fim do mês que vem.
          </p>
        ) : (
          <HistoricoMensal historico={historico} mesLabel={mesLabel} />
        )}
      </section>

      {/* composição por mês (tabela larga) */}
      {colunas.length > 0 && (
        <section className="card" style={{ marginBottom: 16 }}>
          <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h2>Composição por mês</h2>
            <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>arraste ↔ para ver tudo</span>
          </div>
          <div style={{ overflowX: 'auto', padding: '4px 0 8px' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: 12, whiteSpace: 'nowrap', minWidth: '100%' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', left: 0, background: 'var(--surface, #fff)', textAlign: 'left', padding: '8px 14px', color: 'var(--ink-faint)', fontWeight: 600, borderBottom: '1px solid var(--line)' }}>Mês</th>
                  {colunas.map((c) => (
                    <th key={c} style={{ textAlign: 'right', padding: '8px 12px', color: 'var(--ink-faint)', fontWeight: 600, borderBottom: '1px solid var(--line)' }}>{CURTO[c] || c}</th>
                  ))}
                  <th style={{ textAlign: 'right', padding: '8px 14px 8px 12px', color: 'var(--forest-2)', fontWeight: 700, borderBottom: '1px solid var(--line)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {mesesComp.map((m, n) => {
                  const linha = porMesClasse[m] || {};
                  const total = colunas.reduce((s, c) => s + (linha[c] || 0), 0);
                  const atual = m === todayIdx;
                  return (
                    <tr key={m} style={{ background: atual ? 'var(--up-bg)' : n % 2 ? 'var(--surface-2)' : 'transparent' }}>
                      <td style={{ position: 'sticky', left: 0, background: atual ? 'var(--up-bg)' : n % 2 ? 'var(--surface-2)' : 'var(--surface)', textAlign: 'left', padding: '7px 14px', fontWeight: 600, textTransform: 'capitalize', borderBottom: '1px solid var(--line-soft)' }}>
                        {mesLabel(m)}{atual ? ' •' : ''}
                      </td>
                      {colunas.map((c) => (
                        <td key={c} style={{ textAlign: 'right', padding: '7px 12px', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', color: linha[c] ? 'var(--ink)' : 'var(--ink-faint)', borderBottom: '1px solid var(--line-soft)' }}>{valor(linha[c])}</td>
                      ))}
                      <td style={{ textAlign: 'right', padding: '7px 14px 7px 12px', fontFamily: 'var(--font-display)', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'var(--forest-2)', borderBottom: '1px solid var(--line-soft)' }}>{valor(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ padding: '2px 20px 0', fontSize: 11, color: 'var(--ink-faint)' }}>Valores em R$, arredondados. O mês atual (•) é o valor ao vivo de hoje.</p>
        </section>
      )}

      <MetaForm goal={goal} />
    </div>
  );
}
