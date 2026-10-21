// ============================================================================
// lib/dominio/aporte.ts
//
// Como repartir o dinheiro "A investir" entre os ativos abaixo do alvo.
//
// Regra: cada ativo recebe uma fatia proporcional ao tamanho do seu buraco
// (quanto falta para o alvo). O ativo mais atrasado recebe mais, mas todos
// avançam juntos — em vez de despejar tudo no primeiro da fila.
//
//   aporte_i = disponível × buraco_i / Σ buraco
//
// Dois limites:
//   • nunca aportar mais do que o buraco (sobra fica como caixa);
//   • em ativo negociado em cota inteira, se a fatia não paga nem 1 cota, o
//     ativo sai da rodada e a fatia dele é redistribuída entre os demais.
// ============================================================================

export interface EntradaAporte {
  ticker: string;
  /** quanto falta, em R$, para chegar ao alvo (> 0) */
  buraco: number;
  /** preço de 1 cota; 0 quando não há cotação */
  preco: number;
  /** true = só negocia cotas inteiras (B3); false = fracionável (cripto) */
  inteiro: boolean;
}

/** Devolve R$ a aportar por ticker. Quem ficou de fora da rodada recebe 0. */
export function distribuirAporte(
  entradas: EntradaAporte[],
  disponivel: number,
): Record<string, number> {
  const resultado: Record<string, number> = {};
  for (const e of entradas) resultado[e.ticker] = 0;
  if (!(disponivel > 0)) return resultado;

  let pool = entradas.filter((e) => e.buraco > 0);

  while (pool.length > 0) {
    const soma = pool.reduce((s, e) => s + e.buraco, 0);

    // dinheiro de sobra: cada um recebe o buraco inteiro
    if (disponivel >= soma) {
      for (const e of pool) resultado[e.ticker] = e.buraco;
      return resultado;
    }

    const fatia = (e: EntradaAporte) => (disponivel * e.buraco) / soma;

    // quem não paga 1 cota sai; tira um por vez (o menor) e refaz a conta
    const semCota = pool
      .filter((e) => e.inteiro && e.preco > 0 && fatia(e) < e.preco)
      .sort((a, b) => fatia(a) - fatia(b));
    if (semCota.length > 0) {
      pool = pool.filter((e) => e !== semCota[0]);
      continue;
    }

    for (const e of pool) resultado[e.ticker] = fatia(e);
    return resultado;
  }

  return resultado;
}