import { supabaseServer } from '../../lib/supabase';
import BibliotecaLista from './lista-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Tipo do ativo, pro filtro da biblioteca
function categoria(ticker, classe) {
  const t = (ticker || '').toUpperCase();
  const c = (classe || '').toUpperCase();
  if (['BTC', 'SOLANA', 'PENDLE', 'CRIPTO'].includes(c)) return 'cripto';
  if (c === 'FIIS') return 'fii';
  if (/^[A-Z0-9]{4}3[2-9]$/.test(t)) return 'bdr';
  if (/11$/.test(t)) return 'etf';
  return 'acao';
}

export default async function Biblioteca() {
  const sb = supabaseServer();
  const [{ data: trades }, { data: divs }, { data: pos }, { data: precos }, { data: manuais }] = await Promise.all([
    sb.from('trades')
      .select('id, traded_at, side, quantity, price, assets(ticker, asset_classes(name))')
      .order('traded_at', { ascending: true }),
    sb.from('dividends').select('ticker, paid_at, kind, amount'),
    sb.from('v_positions').select('ticker, quantidade, preco_medio, preco_atual, valor_carteira'),
    sb.from('prices').select('ticker, price, updated_at'),
    sb.from('manual_prices').select('ticker, price'),
  ]);

  // Aqui usamos o ÚLTIMO preço conhecido mesmo que antigo (a Biblioteca é histórico:
  // é melhor mostrar a cotação de X dias atrás do que cair no preço médio e zerar o retorno).
  // Quando estiver velha, marcamos a data pra você saber.
  const FRESCO_MS = 48 * 3600 * 1000;
  const AGORA = Date.now();
  const autoDe = {};
  const attDe = {};
  const velhoDe = {};
  (precos || []).forEach((p) => {
    if (!(Number(p.price) > 0)) return;
    autoDe[p.ticker] = Number(p.price);
    attDe[p.ticker] = p.updated_at || null;
    const idade = p.updated_at ? (AGORA - new Date(p.updated_at).getTime()) : Infinity;
    velhoDe[p.ticker] = idade >= FRESCO_MS;
  });
  const manualDe = {};
  (manuais || []).forEach((m) => { manualDe[m.ticker] = Number(m.price); });
  const posDe = {};
  (pos || []).forEach((p) => { posDe[p.ticker] = p; });

  const mapa = {};
  const garante = (ticker, classe) => {
    if (!mapa[ticker]) {
      mapa[ticker] = {
        ticker, classe: classe || '—',
        qtdComprada: 0, qtdVendida: 0, totalComprado: 0, totalVendido: 0,
        primeiraCompra: null, ultimaVenda: null, ultimaMov: null,
        nTrades: 0, dividendos: 0, nDividendos: 0, movimentos: [],
      };
    }
    if (classe && mapa[ticker].classe === '—') mapa[ticker].classe = classe;
    return mapa[ticker];
  };

  (trades || []).forEach((t) => {
    const ticker = t.assets?.ticker;
    if (!ticker) return;
    const a = garante(ticker, t.assets?.asset_classes?.name);
    const qtd = Number(t.quantity) || 0;
    const valor = qtd * (Number(t.price) || 0);
    const dia = (t.traded_at || '').slice(0, 10);
    a.nTrades++;
    if (t.side === 'compra') {
      a.qtdComprada += qtd; a.totalComprado += valor;
      if (!a.primeiraCompra || dia < a.primeiraCompra) a.primeiraCompra = dia;
    } else {
      a.qtdVendida += qtd; a.totalVendido += valor;
      if (!a.ultimaVenda || dia > a.ultimaVenda) a.ultimaVenda = dia;
    }
    if (!a.ultimaMov || dia > a.ultimaMov) a.ultimaMov = dia;
    a.movimentos.push({ dia, side: t.side, qtd, preco: Number(t.price) || 0, valor });
  });

  (divs || []).forEach((d) => {
    if (!d.ticker) return;
    const a = garante(d.ticker, null);
    a.dividendos += Number(d.amount) || 0;
    a.nDividendos++;
  });

  const ativos = Object.values(mapa).map((a) => {
    const p = posDe[a.ticker];
    const qtdAtual = p ? Number(p.quantidade) : Math.max(0, a.qtdComprada - a.qtdVendida);
    const aberto = qtdAtual > 0.0000001;
    const pm = p && Number(p.preco_medio) > 0 ? Number(p.preco_medio) : (a.qtdComprada > 0 ? a.totalComprado / a.qtdComprada : 0);
    const precoAuto = autoDe[a.ticker] ?? null;
    const precoRef = precoAuto ?? manualDe[a.ticker] ?? pm;
    const origemPreco = precoAuto != null
      ? (velhoDe[a.ticker] ? 'auto-velho' : 'auto')
      : (manualDe[a.ticker] != null ? 'manual' : 'pm');
    const precoEm = precoAuto != null && attDe[a.ticker] ? String(attDe[a.ticker]).slice(0, 10) : null;
    const valorAtual = aberto ? qtdAtual * precoRef : 0;
    // retorno total: o que saiu de volta + o que ainda vale + proventos − o que entrou
    const retorno = a.totalVendido + valorAtual + a.dividendos - a.totalComprado;
    const retornoPct = a.totalComprado > 0 ? retorno / a.totalComprado : 0;
    return {
      ...a, qtdAtual, aberto, pm, precoRef, origemPreco, precoEm, valorAtual, retorno, retornoPct,
      cat: categoria(a.ticker, a.classe),
      movimentos: a.movimentos.sort((x, y) => y.dia.localeCompare(x.dia)),
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
