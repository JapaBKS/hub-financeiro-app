import { supabaseServer, lerTudo } from '../../lib/supabase';
import { hojeISO } from '../../lib/dominio/datas';
import { brl, pct } from '../../lib/format';
import GraficoDesempenho from './grafico-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// "E se o mesmo dinheiro tivesse ido para o CDI / Ibovespa?" — cada compra é um aporte e
// cada venda uma retirada, nas mesmas datas. Compara com quanto a carteira vale de fato.

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const chaveMes = (iso) => String(iso).slice(0, 7);
function proximoMes(k) {
  const [a, m] = k.split('-').map(Number);
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`;
}

async function buscarJSON(url) {
  try {
    const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(8000), headers: { 'User-Agent': 'Mozilla/5.0 hub-financeiro' } });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}

// séries mensais do Banco Central: 4391 = CDI acumulado no mês (%), 433 = IPCA do mês (%)
async function serieBCB(codigo, desde) {
  const [a, m] = desde.split('-');
  const d = await buscarJSON(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json&dataInicial=01/${m}/${a}`);
  if (!Array.isArray(d)) return null;
  const out = {};
  d.forEach((x) => { const [, mm, aa] = x.data.split('/'); out[`${aa}-${mm}`] = Number(x.valor) / 100; });
  return out;
}

// Ibovespa: fechamento de cada mês (Yahoo Finance). Se não responder, o gráfico segue sem ele.
async function ibovespaMensal() {
  const d = await buscarJSON('https://query1.finance.yahoo.com/v8/finance/chart/%5EBVSP?range=10y&interval=1mo');
  const r = d?.chart?.result?.[0];
  const ts = r?.timestamp; const fech = r?.indicators?.quote?.[0]?.close;
  if (!ts || !fech) return null;
  const out = {};
  ts.forEach((t, i) => {
    if (fech[i] == null) return;
    const k = new Date((t + 6 * 3600) * 1000).toISOString().slice(0, 7);
    out[k] = fech[i];
  });
  return Object.keys(out).length ? out : null;
}

export default async function Desempenho() {
  const sb = supabaseServer();
  const [tradesRes, posRes, snapRes, classesRes, allocRes] = await Promise.all([
    lerTudo((de, ate) => sb.from('trades')
      .select('traded_at, side, quantity, price, assets(asset_classes(name))')
      .order('traded_at', { ascending: true }).order('id', { ascending: true }).range(de, ate)),
    sb.from('v_positions').select('quantidade, preco_atual, preco_medio'),
    sb.from('portfolio_snapshots').select('snapshot_month, value, asset_classes(name)'),
    sb.from('asset_classes').select('name, fora_rateio'),
    sb.from('v_class_allocation').select('classe, valor'),
  ]);
  if (tradesRes.error) throw new Error('Não foi possível carregar as negociações.');
  const trades = tradesRes.data || [];
  const hoje = hojeISO();
  const mesHoje = chaveMes(hoje);

  if (!trades.length) {
    return (
      <div className="wrap" style={{ maxWidth: 900 }}>
        <header className="topbar"><div className="brand"><div><b>Desempenho</b><span>sua carteira contra CDI, Ibovespa e inflação</span></div></div></header>
        <section className="card" style={{ padding: 20 }}>Nenhuma negociação registrada ainda.</section>
      </div>
    );
  }

  // aporte líquido por mês: compras entram, vendas saem
  const fluxo = {};
  for (const t of trades) {
    const v = Number(t.quantity) * Number(t.price) || 0;
    const k = chaveMes(t.traded_at);
    fluxo[k] = (fluxo[k] || 0) + (t.side === 'venda' ? -v : v);
  }
  const inicio = chaveMes(trades[0].traded_at);
  const meses = [];
  for (let k = inicio; k <= mesHoje; k = proximoMes(k)) meses.push(k);

  const [cdi, ipca, ibov] = await Promise.all([serieBCB(4391, inicio), serieBCB(433, inicio), ibovespaMensal()]);

  // simulação: rende o mês e depois recebe o aporte do mês (o aporte começa a render no mês seguinte)
  const simular = (retornoDoMes) => {
    if (!retornoDoMes) return null;
    let v = 0;
    return meses.map((k) => { v = v * (1 + (retornoDoMes(k) || 0)) + (fluxo[k] || 0); return v; });
  };
  const retIbov = ibov ? (k) => {
    const ant = ibov[meses[meses.indexOf(k) - 1]] ?? null;
    return ant && ibov[k] ? ibov[k] / ant - 1 : 0;
  } : null;
  const linhaCdi = simular(cdi && ((k) => cdi[k]));
  const linhaIpca = simular(ipca && ((k) => ipca[k]));
  const linhaIbov = simular(retIbov);
  let acum = 0;
  const linhaAportes = meses.map((k) => (acum += fluxo[k] || 0));

  // "Você": valor de mercado das classes investidas (sem reserva, fluxo e caixa), pelos snapshots
  // mensais; o mês atual usa o valor ao vivo
  const fora = new Set((classesRes.data || []).filter((c) => c.fora_rateio).map((c) => c.name));
  const classesNegociadas = new Set(trades.map((t) => t.assets?.asset_classes?.name).filter(Boolean));
  const conta = (nome) => nome && !fora.has(nome) && classesNegociadas.has(nome);
  const porMes = {};
  (snapRes.data || []).forEach((s) => {
    const n = s.asset_classes?.name;
    if (!conta(n)) return;
    const k = chaveMes(s.snapshot_month);
    porMes[k] = (porMes[k] || 0) + Number(s.value || 0);
  });
  const valorAgora = (allocRes.data || []).filter((a) => conta(a.classe)).reduce((s, a) => s + Number(a.valor || 0), 0)
    || (posRes.data || []).reduce((s, p) => s + Number(p.quantidade) * Number(p.preco_atual ?? p.preco_medio ?? 0), 0);
  porMes[mesHoje] = valorAgora;
  const linhaVoce = meses.map((k) => (porMes[k] != null ? porMes[k] : null));

  const fim = (l) => (l ? l[l.length - 1] : null);
  const aportado = fim(linhaAportes);
  const cartoes = [
    { nome: 'Você', valor: valorAgora, cor: 'voce' },
    { nome: 'CDI', valor: fim(linhaCdi), cor: 'cdi' },
    { nome: 'Ibovespa', valor: fim(linhaIbov), cor: 'ibov' },
    { nome: 'Inflação (IPCA)', valor: fim(linhaIpca), cor: 'ipca' },
  ];
  const ganho = (v) => (v != null && aportado > 0 ? v / aportado - 1 : null);
  const difCdi = linhaCdi ? valorAgora - fim(linhaCdi) : null;
  const rotulo = (k) => `${MESES[Number(k.slice(5)) - 1]}/${k.slice(2, 4)}`;

  return (
    <div className="wrap" style={{ maxWidth: 900 }}>
      <header className="topbar">
        <div className="brand">
          <div><b>Desempenho</b><span>o mesmo dinheiro, nas mesmas datas, em outros lugares</span></div>
        </div>
      </header>

      <section className="card dp-veredito">
        {difCdi == null ? (
          <p>Não foi possível buscar o CDI agora. Tente recarregar daqui a pouco.</p>
        ) : (
          <>
            <span className="eyebrow">Desde {rotulo(inicio)}, comparado ao CDI</span>
            <b className={difCdi >= 0 ? 'pos' : 'neg'}>{difCdi >= 0 ? '+' : '−'}{brl(Math.abs(difCdi))}</b>
            <p>
              {difCdi >= 0
                ? 'Sua carteira vale mais do que valeria se cada aporte tivesse ido para o CDI.'
                : 'Se cada aporte tivesse ido para o CDI, hoje você teria mais do que a carteira vale.'}
            </p>
          </>
        )}
      </section>

      <div className="dp-cartoes">
        {cartoes.map((c) => (
          <div key={c.nome} className="card dp-cartao">
            <span className="dp-nome"><i className={`dp-cor ${c.cor}`} aria-hidden="true" />{c.nome}</span>
            <b>{c.valor != null ? brl(c.valor) : '—'}</b>
            <small>{c.valor != null && ganho(c.valor) != null ? `${ganho(c.valor) >= 0 ? '+' : '−'}${pct(Math.abs(ganho(c.valor)), 1)} sobre o aportado` : 'sem dados agora'}</small>
          </div>
        ))}
      </div>

      <section className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <h2>Evolução</h2>
          <span className="sub">aportado: {brl(aportado)}</span>
        </div>
        <GraficoDesempenho
          meses={meses.map(rotulo)}
          series={[
            { id: 'voce', nome: 'Você', valores: linhaVoce },
            linhaCdi && { id: 'cdi', nome: 'CDI', valores: linhaCdi },
            linhaIbov && { id: 'ibov', nome: 'Ibovespa', valores: linhaIbov },
            linhaIpca && { id: 'ipca', nome: 'Inflação', valores: linhaIpca },
            { id: 'aporte', nome: 'Aportado', valores: linhaAportes },
          ].filter(Boolean)}
        />
        <p className="ir-nota">
          Cada compra conta como aporte e cada venda como retirada, nas mesmas datas, como se o dinheiro tivesse ido para o CDI, para o Ibovespa ou só corrigido pela inflação.
          &ldquo;Você&rdquo; é o valor de mercado das classes investidas (sem reserva, fluxo e caixa), pelas fotos mensais da carteira.
          {!linhaIbov && ' O Ibovespa não respondeu agora e ficou de fora.'}
        </p>
      </section>
    </div>
  );
}
