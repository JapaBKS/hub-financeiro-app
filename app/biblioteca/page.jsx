import { supabaseServer } from '../../lib/supabase';
import { calcularHistorico, fatorDesde } from '../../lib/dominio/posicoes';
import BibliotecaLista from './lista-client';
import { hojeISO } from '../../lib/dominio/datas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;


function mesesEntre(ini, fim) {
  if (!ini || !fim) return 1;
  const [ay, am] = ini.slice(0, 7).split('-').map(Number);
  const [by, bm] = fim.slice(0, 7).split('-').map(Number);
  return Math.max(1, (by - ay) * 12 + (bm - am) + 1);
}

export default async function Biblioteca() {
  const sb = supabaseServer();
  const [{ data: trades }, { data: divs }, { data: precos }, { data: manuais }, { data: eventos }] = await Promise.all([
    sb.from('trades')
      .select('id, traded_at, side, quantity, price, assets(ticker, asset_classes(name))')
      .order('traded_at', { ascending: true })
      .order('id', { ascending: true }),
    sb.from('dividends').select('ticker, paid_at, kind, amount'),
    sb.from('prices').select('ticker, price, updated_at'),
    sb.from('manual_prices').select('ticker, price'),
    sb.from('corporate_events').select('ticker, event_date, fator').order('event_date'),
  ]);

  // posição, custo médio, agregados e movimentos: tudo do domínio
  const { posicoes } = calcularHistorico(trades, eventos);
  const fator = fatorDesde(eventos);

  // Biblioteca mostra o último preço conhecido mesmo antigo: cair no preço médio
  // zeraria o retorno das posições abertas. Marcamos a data quando está velho.
  const FRESCO_MS = 48 * 3600 * 1000;
  const AGORA = Date.now();
  const autoDe = {}, attDe = {}, velhoDe = {};
  (precos || []).forEach((p) => {
    if (!(Number(p.price) > 0)) return;
    autoDe[p.ticker] = Number(p.price);
    attDe[p.ticker] = p.updated_at || null;
    const idade = p.updated_at ? (AGORA - new Date(p.updated_at).getTime()) : Infinity;
    velhoDe[p.ticker] = idade >= FRESCO_MS;
  });
  const manualDe = {};
  (manuais || []).forEach((m) => { manualDe[m.ticker] = Number(m.price); });

  // proventos por ticker
  const provDe = {};
  (divs || []).forEach((d) => {
    if (!d.ticker) return;
    const tk = d.ticker.toUpperCase();
    (provDe[tk] ||= { total: 0, n: 0, pagamentos: [] });
    const v = Number(d.amount) || 0;
    provDe[tk].total += v;
    provDe[tk].n++;
    provDe[tk].pagamentos.push({ dia: (d.paid_at || '').slice(0, 10), valor: v });
  });

  const hoje = hojeISO();
  const tickers = [...new Set([...Object.keys(posicoes), ...Object.keys(provDe)])];

  const ativos = tickers.map((ticker) => {
    const P = posicoes[ticker] || {
      ticker, classe: null, cat: 'acao', quantidade: 0, precoMedio: 0,
      qtdComprada: 0, qtdVendida: 0, totalComprado: 0, totalVendido: 0,
      primeiraCompra: null, ultimaVenda: null, ultimaMov: null, nTrades: 0, movimentos: [],
    };
    const prov = provDe[ticker] || { total: 0, n: 0, pagamentos: [] };

    const qtdAtual = P.quantidade;
    const aberto = qtdAtual > 0.0000001;
    const pm = P.precoMedio || (P.qtdComprada > 0 ? P.totalComprado / P.qtdComprada : 0);

    const precoAuto = autoDe[ticker] ?? null;
    const precoRef = precoAuto ?? manualDe[ticker] ?? pm;
    const origemPreco = precoAuto != null
      ? (velhoDe[ticker] ? 'auto-velho' : 'auto')
      : (manualDe[ticker] != null ? 'manual' : 'pm');
    const precoEm = precoAuto != null && attDe[ticker] ? String(attDe[ticker]).slice(0, 10) : null;
    const valorAtual = aberto ? qtdAtual * precoRef : 0;

    // dividendo por cota: posição (em cotas de hoje) na data de cada pagamento
    const movimentos = P.movimentos || [];
    const deltas = movimentos
      .map((m) => ({ dia: m.dia, delta: m.side === 'compra' ? m.qtdHoje : -m.qtdHoje }))
      .sort((a, b) => a.dia.localeCompare(b.dia));
    const pagos = prov.pagamentos.filter((x) => x.dia).sort((a, b) => a.dia.localeCompare(b.dia));

    let i = 0, posicao = 0, somaPorCota = 0, nComPosicao = 0;
    for (const pg of pagos) {
      while (i < deltas.length && deltas[i].dia <= pg.dia) { posicao += deltas[i].delta; i++; }
      if (posicao > 0.0000001) { somaPorCota += pg.valor / posicao; nComPosicao++; }
    }
    const porCotaMedio = nComPosicao > 0 ? somaPorCota / nComPosicao : 0;
    const mesesPagos = pagos.length ? mesesEntre(pagos[0].dia, hoje) : 0;
    const porCotaMes = mesesPagos > 0 ? somaPorCota / mesesPagos : 0;
    const rendaMensal = porCotaMes * qtdAtual;
    const yieldMes = precoRef > 0 ? porCotaMes / precoRef : 0;

    // retorno total: vendas + valor de hoje + proventos − compras
    const retorno = P.totalVendido + valorAtual + prov.total - P.totalComprado;
    const retornoPct = P.totalComprado > 0 ? retorno / P.totalComprado : 0;

    return {
      ticker,
      classe: P.classe || '—',
      cat: P.cat,
      qtdComprada: P.qtdComprada,
      qtdVendida: P.qtdVendida,
      totalComprado: P.totalComprado,
      totalVendido: P.totalVendido,
      primeiraCompra: P.primeiraCompra,
      ultimaVenda: P.ultimaVenda,
      ultimaMov: P.ultimaMov,
      nTrades: P.nTrades,
      movimentos,
      dividendos: prov.total,
      nDividendos: prov.n,
      qtdAtual, aberto, pm, precoRef, origemPreco, precoEm, valorAtual, retorno, retornoPct,
      porCotaMedio, porCotaMes, rendaMensal, yieldMes, mesesPagos, nComPosicao,
      primeiroPagamento: pagos[0]?.dia || null,
      ultimoPagamento: pagos[pagos.length - 1]?.dia || null,
    };
  }).sort((x, y) => {
    if (x.aberto !== y.aberto) return x.aberto ? -1 : 1;
    return x.aberto ? y.valorAtual - x.valorAtual : (y.ultimaMov || '').localeCompare(x.ultimaMov || '');
  });

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Biblioteca</b><span>{ativos.length} ativos no histórico</span></div>
        </div>
        <a href="/carteira" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>carteira →</a>
      </header>
      <BibliotecaLista ativos={ativos} />
    </div>
  );
}
