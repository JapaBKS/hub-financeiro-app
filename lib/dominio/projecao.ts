// ============================================================================
// lib/dominio/projecao.ts
//
// Projeção baseada no DESEMPENHO REAL, não em premissas fixas.
//
// A tela de Meta projetava com números decididos na mão (1% ao mês, aporte de
// R$1.000 crescendo 10% ao ano). Isso responde "quando eu chegaria SE fosse
// assim" — não "quando eu chego no ritmo em que estou de fato".
//
// Aqui as duas variáveis saem do histórico de snapshots:
//   aporte médio  -> diferença do aporte acumulado dividida pelos meses
//   rentabilidade -> a taxa que explica o patrimônio de hoje, dados o inicial
//                    e os aportes feitos (retorno ponderado pelo dinheiro)
// ============================================================================

export interface PontoHistorico {
  /** índice absoluto do mês: ano*12 + mês */
  idx: number;
  patrimonio: number;
  aporteAcumulado: number | null;
}

export type ModoMedicao = 'aporte-e-taxa' | 'crescimento-total';

export interface DesempenhoReal {
  confiavel: boolean;
  modo: ModoMedicao;
  /** só no modo 'crescimento-total': quanto o patrimônio cresce por mês, tudo junto */
  crescimentoMensal: number;
  meses: number;
  aporteMensal: number;
  /** taxa mensal (0,005 = 0,5% ao mês) */
  taxaMensal: number;
  taxaAnual: number;
  patrimonioInicial: number;
  patrimonioAtual: number;
  motivo?: string;
}

const MESES_MINIMOS = 3;

/**
 * Acha a taxa mensal que, partindo do patrimônio inicial e somando o aporte
 * todo mês, chega ao patrimônio atual. Resolve por bisseção: não existe
 * fórmula fechada, então cercamos o valor testando intervalos cada vez menores.
 */
function acharTaxa(inicial: number, aporte: number, meses: number, final: number): number {
  const simular = (taxa: number) => {
    let saldo = inicial;
    for (let m = 0; m < meses; m++) saldo = saldo * (1 + taxa) + aporte;
    return saldo;
  };

  let baixo = -0.5, alto = 0.5;   // -50% a +50% ao mês cobre qualquer caso real
  if (simular(baixo) > final) return baixo;
  if (simular(alto) < final) return alto;

  for (let i = 0; i < 80; i++) {
    const meio = (baixo + alto) / 2;
    if (simular(meio) < final) baixo = meio; else alto = meio;
  }
  return (baixo + alto) / 2;
}

export function medirDesempenho(pontos: PontoHistorico[]): DesempenhoReal {
  const ordenados = [...pontos].sort((a, b) => a.idx - b.idx);
  const vazio = (motivo: string): DesempenhoReal => ({
    confiavel: false, modo: 'crescimento-total', crescimentoMensal: 0,
    meses: ordenados.length, aporteMensal: 0,
    taxaMensal: 0, taxaAnual: 0, patrimonioInicial: 0, patrimonioAtual: 0, motivo,
  });

  if (ordenados.length < MESES_MINIMOS) return vazio('histórico curto');

  const primeiro = ordenados[0];
  const ultimo = ordenados[ordenados.length - 1];
  const meses = ultimo.idx - primeiro.idx;
  if (meses < MESES_MINIMOS - 1) return vazio('período curto');

  const base = {
    meses,
    patrimonioInicial: primeiro.patrimonio,
    patrimonioAtual: ultimo.patrimonio,
  };

  // Sem o registro de aportes, medimos o CRESCIMENTO TOTAL do patrimônio.
  // Ele mistura aporte e rentabilidade — não separa as duas coisas, mas
  // responde "no ritmo em que venho crescendo, quando chego lá?".
  const semAporte = primeiro.aporteAcumulado == null || ultimo.aporteAcumulado == null;
  if (semAporte || !(ultimo.aporteAcumulado! - primeiro.aporteAcumulado! > 0)) {
    if (!(primeiro.patrimonio > 0)) return vazio('patrimônio inicial zerado');
    const crescimentoMensal = Math.pow(ultimo.patrimonio / primeiro.patrimonio, 1 / meses) - 1;
    return {
      ...base,
      confiavel: true,
      modo: 'crescimento-total',
      crescimentoMensal,
      aporteMensal: 0,
      taxaMensal: crescimentoMensal,
      taxaAnual: Math.pow(1 + crescimentoMensal, 12) - 1,
    };
  }

  const aporteMensal = (ultimo.aporteAcumulado! - primeiro.aporteAcumulado!) / meses;

  const taxaMensal = acharTaxa(primeiro.patrimonio, aporteMensal, meses, ultimo.patrimonio);
  return {
    ...base,
    confiavel: true,
    modo: 'aporte-e-taxa',
    crescimentoMensal: Math.pow(ultimo.patrimonio / primeiro.patrimonio, 1 / meses) - 1,
    aporteMensal,
    taxaMensal,
    taxaAnual: Math.pow(1 + taxaMensal, 12) - 1,
  };
}

/** Em que mês o patrimônio alcança o alvo, mantendo o ritmo medido. */
export function mesQueAlcanca(
  valorAtual: number, idxAtual: number, alvo: number,
  aporteMensal: number, taxaMensal: number, limite = 1200,
): number | null {
  if (valorAtual >= alvo) return idxAtual;
  if (aporteMensal <= 0 && taxaMensal <= 0) return null;

  let saldo = valorAtual, idx = idxAtual, n = 0;
  while (saldo < alvo && n < limite) {
    saldo = saldo * (1 + taxaMensal) + aporteMensal;
    idx++; n++;
  }
  return saldo >= alvo ? idx : null;
}
