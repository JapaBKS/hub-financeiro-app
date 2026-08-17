// ============================================================================
// lib/dominio/precos.ts
//
// Qual preço usar para um ativo? A regra estava escrita em Carteira,
// Recomendações e Biblioteca — e as três discordavam. Em Recomendações a
// cotação velha vinha ANTES do preço manual, então o manual era ignorado
// sempre que existisse qualquer cotação, mesmo de semanas atrás.
//
// Ordem de preferência (a razão de cada passo importa):
//   1. cotação recente    — é o valor de mercado
//   2. preço manual       — você o cadastrou JUSTAMENTE porque a cotação falhou
//   3. cotação antiga     — melhor que nada; sinalizamos que está velha
//   4. preço médio        — último recurso: mostra o custo, não o valor
// ============================================================================

export type OrigemPreco = 'auto' | 'manual' | 'auto-velho' | 'pm' | 'nenhum';

export interface PrecoResolvido {
  preco: number;
  origem: OrigemPreco;
  /** data da cotação automática, quando foi ela que valeu */
  atualizadoEm: string | null;
  /** true quando o preço não reflete o mercado agora */
  desatualizado: boolean;
}

interface LinhaPreco { ticker?: string | null; price?: number | string | null; updated_at?: string | null }
interface LinhaManual { ticker?: string | null; price?: number | string | null }

const HORAS_FRESCO = 48;

/**
 * Devolve uma função que resolve o preço de qualquer ticker.
 * Recebe as tabelas uma vez e evita reprocessar a cada ativo.
 */
export function criarResolvedorDePreco(
  precos: LinhaPreco[] | null | undefined,
  manuais: LinhaManual[] | null | undefined,
  horasFresco = HORAS_FRESCO,
) {
  const limite = horasFresco * 3600 * 1000;
  const agora = Date.now();

  const auto: Record<string, { preco: number; em: string | null; velho: boolean }> = {};
  for (const p of precos || []) {
    const tk = (p.ticker || '').toUpperCase();
    const valor = Number(p.price) || 0;
    if (!tk || valor <= 0) continue;
    const idade = p.updated_at ? agora - new Date(p.updated_at).getTime() : Infinity;
    auto[tk] = { preco: valor, em: p.updated_at || null, velho: idade >= limite };
  }

  const manual: Record<string, number> = {};
  for (const m of manuais || []) {
    const tk = (m.ticker || '').toUpperCase();
    const valor = Number(m.price) || 0;
    if (tk && valor > 0) manual[tk] = valor;
  }

  return function resolver(ticker: string, precoMedio = 0): PrecoResolvido {
    const tk = (ticker || '').toUpperCase();
    const a = auto[tk];
    const m = manual[tk];

    if (a && !a.velho) {
      return { preco: a.preco, origem: 'auto', atualizadoEm: a.em, desatualizado: false };
    }
    if (m && m > 0) {
      return { preco: m, origem: 'manual', atualizadoEm: null, desatualizado: false };
    }
    if (a) {
      return { preco: a.preco, origem: 'auto-velho', atualizadoEm: a.em, desatualizado: true };
    }
    if (precoMedio > 0) {
      return { preco: precoMedio, origem: 'pm', atualizadoEm: null, desatualizado: true };
    }
    return { preco: 0, origem: 'nenhum', atualizadoEm: null, desatualizado: true };
  };
}
