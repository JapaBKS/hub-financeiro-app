// ============================================================================
// lib/dominio/posicoes.js
//
// CAMADA DE DOMÍNIO: aqui mora a regra de negócio de posição e custo médio.
//
// Por que separar? Antes esta mesma regra existia em 4 lugares (Apuração,
// Biblioteca, Negociações e na função f_positions do SQL). Regra duplicada
// não fica duplicada por muito tempo: ela DIVERGE. Foi exatamente o que
// aconteceu quando a Negociações passou a aplicar desdobramento e a Carteira
// não — os saldos deixaram de bater.
//
// O princípio aqui é "Single Source of Truth" (uma única fonte da verdade),
// que na prática é o DRY do Pragmatic Programmer: "toda peça de conhecimento
// deve ter uma representação única e não ambígua no sistema".
//
// Estas funções são PURAS: não acessam banco, não conhecem React nem Next.
// Recebem dados e devolvem dados. Isso as torna testáveis isoladamente e
// reutilizáveis por qualquer tela — é a ideia de isolar o domínio das bordas
// (Clean/Hexagonal Architecture: a regra não depende da infraestrutura).
// ============================================================================

/**
 * Categoria tributária do ativo. Regra fiscal, não visual:
 *  acao -> ação à vista (isenção de R$20 mil/mês em vendas)
 *  bdr  -> BDR (sem isenção)
 *  etf  -> ETF de ações (sem isenção)
 *  fii  -> fundo imobiliário (20%, apura separado dos demais)
 */
export function categoria(ticker, classe) {
  const t = (ticker || '').toUpperCase();
  if ((classe || '').toUpperCase() === 'FIIS') return 'fii';
  if (/^[A-Z0-9]{4}3[2-9]$/.test(t)) return 'bdr';
  if (/11$/.test(t)) return 'etf';
  return 'acao';
}

/**
 * Adaptador: converte as linhas do Supabase para o formato do domínio.
 *
 * Isto é uma "Anti-Corruption Layer" (DDD): o formato do banco não vaza para
 * dentro da regra. Se amanhã a query mudar o shape (ou trocarmos de banco),
 * só este adaptador muda — o cálculo continua intacto.
 */
export function normalizarTrades(linhas) {
  return (linhas || [])
    .map((r) => ({
      id: r.id ?? null,
      dia: (r.traded_at || '').slice(0, 10),
      ticker: r.assets?.ticker || r.ticker || null,
      classe: r.assets?.asset_classes?.name || r.classe || null,
      side: r.side,
      quantidade: Number(r.quantity) || 0,
      preco: Number(r.price) || 0,
    }))
    .filter((t) => t.ticker && t.dia);
}

export function normalizarEventos(linhas) {
  return (linhas || [])
    .map((e) => ({
      dia: (e.event_date || '').slice(0, 10),
      ticker: (e.ticker || '').toUpperCase(),
      fator: Number(e.fator) || 1,
      tipo: e.tipo || 'desdobramento',
    }))
    .filter((e) => e.ticker && e.dia && e.fator > 0);
}

/**
 * Junta negociações e eventos numa linha do tempo única e ordenada.
 *
 * Detalhe que importa: no MESMO dia, o evento vem ANTES das negociações.
 * Um desdobramento ocorre na abertura, então quem negocia naquele dia já
 * negocia a quantidade nova. Inverter isso muda o resultado do cálculo.
 */
function linhaDoTempo(trades, eventos) {
  return [
    ...trades.map((t) => ({ ...t, tipoRegistro: 'trade' })),
    ...eventos.map((e) => ({ ...e, tipoRegistro: 'evento' })),
  ].sort((a, b) =>
    a.dia.localeCompare(b.dia)
    || (a.tipoRegistro === 'evento' ? -1 : b.tipoRegistro === 'evento' ? 1 : 0)
    || ((a.id ?? 0) - (b.id ?? 0)));
}

/**
 * Percorre a história e devolve TUDO que as telas precisam, numa passada só.
 *
 * Método: custo médio móvel (o que a Receita exige e o que a corretora usa).
 *   compra -> soma quantidade e soma custo
 *   venda  -> resultado = (preço − custo médio da época) × quantidade,
 *             e o custo total baixa proporcionalmente
 *   evento -> multiplica a quantidade, MANTÉM o custo total
 *             (por isso o preço médio se ajusta sozinho)
 *
 * Uma passada só em vez de um cálculo por tela: além de mais rápido (O(n) em
 * vez de O(n) várias vezes), garante que todas as telas enxerguem o mesmo
 * estado — que era o problema original.
 */
export function calcularHistorico(tradesBrutos, eventosBrutos) {
  const trades = normalizarTrades(tradesBrutos);
  const eventos = normalizarEventos(eventosBrutos);

  const posicoes = {};          // ticker -> { qtd, custo, classe }
  const vendas = [];            // toda venda com resultado realizado
  const saldoApos = {};         // id da trade -> quantidade depois dela
  const negativos = new Set();  // quantidade ficou negativa: falta algo

  const garante = (ticker, classe) => {
    if (!posicoes[ticker]) posicoes[ticker] = { qtd: 0, custo: 0, classe: classe || null };
    if (classe && !posicoes[ticker].classe) posicoes[ticker].classe = classe;
    return posicoes[ticker];
  };

  for (const reg of linhaDoTempo(trades, eventos)) {
    const P = garante(reg.ticker, reg.classe);

    if (reg.tipoRegistro === 'evento') {
      P.qtd *= reg.fator;                 // custo total não muda
      continue;
    }

    const { quantidade: q, preco: p } = reg;
    if (!q || !p) continue;

    if (reg.side === 'compra') {
      P.qtd += q;
      P.custo += q * p;
    } else {
      const pm = P.qtd > 0 ? P.custo / P.qtd : 0;
      const resultado = (p - pm) * q;
      P.custo -= pm * Math.min(q, P.qtd > 0 ? P.qtd : q);
      P.qtd -= q;

      // Quantidade negativa é um SINAL, não um erro a esconder: quase sempre
      // significa desdobramento ou compra faltando no histórico.
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
        resultado,
      });
    }

    if (P.qtd <= 0.0000001) { P.qtd = 0; P.custo = 0; }
    if (reg.id != null) saldoApos[reg.id] = P.qtd;
  }

  const resumo = {};
  for (const [ticker, P] of Object.entries(posicoes)) {
    resumo[ticker] = {
      ticker,
      classe: P.classe,
      quantidade: P.qtd,
      custoTotal: P.custo,
      precoMedio: P.qtd > 0 ? P.custo / P.qtd : 0,
    };
  }

  return { posicoes: resumo, vendas, saldoApos, negativos: [...negativos].sort() };
}

/**
 * Fator acumulado de eventos APÓS uma data — converte quantidades antigas
 * em cotas equivalentes de hoje. Ex.: 1 cota antes de um 1:10 vale 10 hoje.
 * Usado para normalizar dividendos por cota ao longo do tempo.
 */
export function fatorDesde(eventosBrutos) {
  const porTicker = {};
  for (const e of normalizarEventos(eventosBrutos)) {
    (porTicker[e.ticker] ||= []).push(e);
  }
  return (ticker, dia) =>
    (porTicker[(ticker || '').toUpperCase()] || [])
      .reduce((f, e) => (e.dia > dia ? f * e.fator : f), 1);
}
