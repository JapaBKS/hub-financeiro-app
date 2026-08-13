// ============================================================================
// lib/dominio/posicoes.ts
//
// Regra de posição e custo médio — fonte única. Antes esta conta existia em
// 4 arquivos; cópias divergem (foi o bug de Carteira x Negociações).
// Funções puras: sem banco, sem React. Entra dado, sai dado.
// ============================================================================

/** Categoria tributária — define a regra de imposto, não a aparência. */
export type Categoria = 'acao' | 'bdr' | 'etf' | 'fii' | 'cripto';
export type Lado = 'compra' | 'venda';

/** Formato que vem do Supabase (join aninhado). Só o adaptador conhece isto. */
export interface TradeBruto {
  id?: number | null;
  traded_at?: string | null;
  side?: string | null;
  quantity?: number | string | null;
  price?: number | string | null;
  ticker?: string | null;
  classe?: string | null;
  assets?: { ticker?: string | null; asset_classes?: { name?: string | null } | null } | null;
}

export interface EventoBruto {
  ticker?: string | null;
  event_date?: string | null;
  fator?: number | string | null;
  tipo?: string | null;
}

/** Formato interno do domínio — estável, independente do banco. */
export interface Trade {
  id: number | null;
  dia: string;          // 'YYYY-MM-DD'
  ticker: string;
  classe: string | null;
  side: Lado;
  quantidade: number;
  preco: number;
}

export interface Evento {
  dia: string;
  ticker: string;
  fator: number;        // multiplica a quantidade; custo total não muda
  tipo: string;
}

export interface Venda {
  dia: string;
  mes: string;          // 'YYYY-MM'
  ticker: string;
  classe: string | null;
  cat: Categoria;
  qtd: number;
  preco: number;
  pm: number;           // custo médio no momento da venda
  bruto: number;
  resultado: number;    // (preço − custo médio) × quantidade
}

export interface Movimento {
  dia: string;
  side: Lado;
  qtd: number;            // quantidade da nota (como foi executada)
  qtdHoje: number;        // equivalente em cotas de hoje (pós-desdobramentos)
  preco: number;
  valor: number;
}

export interface Posicao {
  ticker: string;
  classe: string | null;
  cat: Categoria;
  quantidade: number;
  custoTotal: number;
  precoMedio: number;
  // agregados de toda a história do ativo
  qtdComprada: number;
  qtdVendida: number;
  totalComprado: number;
  totalVendido: number;
  primeiraCompra: string | null;
  ultimaVenda: string | null;
  ultimaMov: string | null;
  nTrades: number;
  movimentos: Movimento[];
}

export interface Historico {
  posicoes: Record<string, Posicao>;
  vendas: Venda[];
  saldoApos: Record<number, number>;  // id da trade -> quantidade depois dela
  negativos: string[];                // quantidade ficou negativa: falta dado
}

const CLASSES_CRIPTO = ['BTC', 'SOLANA', 'PENDLE', 'CRIPTO'];

export function categoria(ticker: string, classe?: string | null): Categoria {
  const t = (ticker || '').toUpperCase();
  const c = (classe || '').toUpperCase();
  if (CLASSES_CRIPTO.includes(c)) return 'cripto';
  if (c === 'FIIS') return 'fii';
  if (/^[A-Z0-9]{4}3[2-9]$/.test(t)) return 'bdr';
  if (/11$/.test(t)) return 'etf';
  return 'acao';
}

const num = (v: unknown): number => Number(v) || 0;

/** Traduz o formato do banco para o do domínio. Se a query mudar, só isto muda. */
export function normalizarTrades(linhas: TradeBruto[] | null | undefined): Trade[] {
  return (linhas || [])
    .map((r): Trade => ({
      id: r.id ?? null,
      dia: (r.traded_at || '').slice(0, 10),
      ticker: (r.assets?.ticker || r.ticker || '').toUpperCase(),
      classe: r.assets?.asset_classes?.name || r.classe || null,
      side: r.side === 'venda' ? 'venda' : 'compra',
      quantidade: num(r.quantity),
      preco: num(r.price),
    }))
    .filter((t) => t.ticker !== '' && t.dia !== '');
}

export function normalizarEventos(linhas: EventoBruto[] | null | undefined): Evento[] {
  return (linhas || [])
    .map((e): Evento => ({
      dia: (e.event_date || '').slice(0, 10),
      ticker: (e.ticker || '').toUpperCase(),
      fator: num(e.fator),
      tipo: e.tipo || 'desdobramento',
    }))
    .filter((e) => e.ticker !== '' && e.dia !== '' && e.fator > 0);
}

type Registro =
  | (Trade & { tipoRegistro: 'trade' })
  | (Evento & { tipoRegistro: 'evento' });

/** No mesmo dia, evento vem ANTES da negociação: desdobramento ocorre na abertura. */
function linhaDoTempo(trades: Trade[], eventos: Evento[]): Registro[] {
  const regs: Registro[] = [
    ...trades.map((t) => ({ ...t, tipoRegistro: 'trade' as const })),
    ...eventos.map((e) => ({ ...e, tipoRegistro: 'evento' as const })),
  ];
  return regs.sort((a, b) =>
    a.dia.localeCompare(b.dia)
    || (a.tipoRegistro === 'evento' ? -1 : b.tipoRegistro === 'evento' ? 1 : 0)
    || ((a.tipoRegistro === 'trade' ? a.id ?? 0 : 0) - (b.tipoRegistro === 'trade' ? b.id ?? 0 : 0)));
}

/**
 * Uma passada só produz tudo que as telas precisam.
 * Custo médio móvel: compra soma; venda realiza (preço − PM) e baixa o custo
 * proporcional; evento multiplica a quantidade mantendo o custo total.
 */
export function calcularHistorico(
  tradesBrutos: TradeBruto[] | null | undefined,
  eventosBrutos: EventoBruto[] | null | undefined,
): Historico {
  const trades = normalizarTrades(tradesBrutos);
  const eventos = normalizarEventos(eventosBrutos);

  const fator = fatorDesde(eventosBrutos);
  interface Estado {
    qtd: number; custo: number; classe: string | null;
    qtdComprada: number; qtdVendida: number;
    totalComprado: number; totalVendido: number;
    primeiraCompra: string | null; ultimaVenda: string | null; ultimaMov: string | null;
    nTrades: number; movimentos: Movimento[];
  }
  const novoEstado = (): Estado => ({
    qtd: 0, custo: 0, classe: null,
    qtdComprada: 0, qtdVendida: 0, totalComprado: 0, totalVendido: 0,
    primeiraCompra: null, ultimaVenda: null, ultimaMov: null,
    nTrades: 0, movimentos: [],
  });
  const estado: Record<string, Estado> = {};
  const vendas: Venda[] = [];
  const saldoApos: Record<number, number> = {};
  const negativos = new Set<string>();

  for (const reg of linhaDoTempo(trades, eventos)) {
    const P = (estado[reg.ticker] ||= novoEstado());

    if (reg.tipoRegistro === 'evento') {
      P.qtd *= reg.fator;
      continue;
    }

    if (reg.classe && !P.classe) P.classe = reg.classe;
    const { quantidade: q, preco: p } = reg;
    if (!q || !p) continue;

    P.nTrades++;
    if (!P.ultimaMov || reg.dia > P.ultimaMov) P.ultimaMov = reg.dia;
    P.movimentos.push({
      dia: reg.dia, side: reg.side, qtd: q,
      qtdHoje: q * fator(reg.ticker, reg.dia), preco: p, valor: q * p,
    });

    if (reg.side === 'compra') {
      P.qtd += q;
      P.custo += q * p;
      P.qtdComprada += q;
      P.totalComprado += q * p;
      if (!P.primeiraCompra || reg.dia < P.primeiraCompra) P.primeiraCompra = reg.dia;
    } else {
      P.qtdVendida += q;
      P.totalVendido += q * p;
      if (!P.ultimaVenda || reg.dia > P.ultimaVenda) P.ultimaVenda = reg.dia;
      const pm = P.qtd > 0 ? P.custo / P.qtd : 0;
      P.custo -= pm * (P.qtd > 0 ? Math.min(q, P.qtd) : q);
      P.qtd -= q;

      if (P.qtd < -0.0001) negativos.add(reg.ticker);

      vendas.push({
        dia: reg.dia,
        mes: reg.dia.slice(0, 7),
        ticker: reg.ticker,
        classe: P.classe,
        cat: categoria(reg.ticker, P.classe),
        qtd: q,
        preco: p,
        pm,
        bruto: q * p,
        resultado: (p - pm) * q,
      });
    }

    if (P.qtd <= 0.0000001) { P.qtd = 0; P.custo = 0; }
    if (reg.id != null) saldoApos[reg.id] = P.qtd;
  }

  const posicoes: Record<string, Posicao> = {};
  for (const [ticker, P] of Object.entries(estado)) {
    posicoes[ticker] = {
      ticker,
      classe: P.classe,
      cat: categoria(ticker, P.classe),
      quantidade: P.qtd,
      custoTotal: P.custo,
      precoMedio: P.qtd > 0 ? P.custo / P.qtd : 0,
      qtdComprada: P.qtdComprada,
      qtdVendida: P.qtdVendida,
      totalComprado: P.totalComprado,
      totalVendido: P.totalVendido,
      primeiraCompra: P.primeiraCompra,
      ultimaVenda: P.ultimaVenda,
      ultimaMov: P.ultimaMov,
      nTrades: P.nTrades,
      movimentos: P.movimentos.sort((a, b) => b.dia.localeCompare(a.dia)),
    };
  }

  return { posicoes, vendas, saldoApos, negativos: [...negativos].sort() };
}

/** Fator acumulado APÓS uma data — converte quantidades antigas em cotas de hoje. */
export function fatorDesde(
  eventosBrutos: EventoBruto[] | null | undefined,
): (ticker: string, dia: string) => number {
  const porTicker: Record<string, Evento[]> = {};
  for (const e of normalizarEventos(eventosBrutos)) {
    (porTicker[e.ticker] ||= []).push(e);
  }
  return (ticker, dia) =>
    (porTicker[(ticker || '').toUpperCase()] || [])
      .reduce((f, e) => (e.dia > dia ? f * e.fator : f), 1);
}
