// ============================================================================
// lib/dominio/proventos.ts
// Descobre QUANDO um ativo costuma pagar, a partir do histórico.
// FIIs quase sempre seguem uma regra: "todo dia 15", "toda 2ª quinta-feira",
// "no fim do mês". Saber isso ajuda a planejar o fluxo do mês.
// ============================================================================

export type TipoPadrao = 'dia-fixo' | 'semana-do-mes' | 'fim-do-mes' | 'irregular';

export interface PadraoPagamento {
  tipo: TipoPadrao;
  descricao: string;
  /** dia do mês típico — serve para ordenar */
  diaTipico: number;
  /** 0 a 1: proporção dos pagamentos que seguem a regra */
  confianca: number;
  amostras: number;
}

const SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const ORDINAL = ['', '1ª', '2ª', '3ª', '4ª', 'última'];

/** Interpreta 'AAAA-MM-DD' no fuso local — `new Date(iso)` trataria como UTC e poderia voltar um dia. */
function partes(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  const data = new Date(a, m - 1, d);
  const ultimoDia = new Date(a, m, 0).getDate();
  return {
    dia: d,
    diaSemana: data.getDay(),
    semanaDoMes: Math.ceil(d / 7),          // 1ª a 5ª ocorrência daquele dia da semana
    diasAteFimDoMes: ultimoDia - d,
  };
}

/** valor mais frequente + com que frequência aparece */
function moda<T>(valores: T[]): { valor: T; proporcao: number } | null {
  if (!valores.length) return null;
  const contagem = new Map<T, number>();
  for (const v of valores) contagem.set(v, (contagem.get(v) || 0) + 1);
  let melhor: T = valores[0], maior = 0;
  for (const [v, n] of contagem) if (n > maior) { melhor = v; maior = n; }
  return { valor: melhor, proporcao: maior / valores.length };
}

const CONFIANCA_MINIMA = 0.6;

export function detectarPadraoPagamento(datasISO: string[]): PadraoPagamento {
  const datas = [...new Set(datasISO.filter(Boolean).map((d) => d.slice(0, 10)))].sort();
  const vazio: PadraoPagamento = {
    tipo: 'irregular', descricao: 'sem padrão definido', diaTipico: 0, confianca: 0, amostras: datas.length,
  };
  if (datas.length < 3) return { ...vazio, descricao: 'histórico curto' };

  const info = datas.map(partes);

  // 1) dia fixo do mês (tolera 1 dia de diferença, por causa de fim de semana)
  const dias = info.map((i) => i.dia);
  const mDia = moda(dias)!;
  const perto = dias.filter((d) => Math.abs(d - mDia.valor) <= 1).length / dias.length;

  // 2) enésimo dia da semana (ex.: 2ª quinta-feira)
  const chaveSemana = info.map((i) => `${i.semanaDoMes}|${i.diaSemana}`);
  const mSemana = moda(chaveSemana)!;

  // 3) fim do mês (últimos 3 dias)
  const fimDoMes = info.filter((i) => i.diasAteFimDoMes <= 2).length / info.length;

  const candidatos: PadraoPagamento[] = [];

  if (perto >= CONFIANCA_MINIMA) {
    candidatos.push({
      tipo: 'dia-fixo',
      descricao: `todo dia ${mDia.valor}`,
      diaTipico: mDia.valor,
      confianca: perto,
      amostras: datas.length,
    });
  }

  if (mSemana.proporcao >= CONFIANCA_MINIMA) {
    const [semana, diaSemana] = mSemana.valor.split('|').map(Number);
    const mediaDia = Math.round(dias.reduce((s, d) => s + d, 0) / dias.length);
    candidatos.push({
      tipo: 'semana-do-mes',
      descricao: `${ORDINAL[Math.min(semana, 5)]} ${SEMANA[diaSemana]}`,
      diaTipico: mediaDia,
      confianca: mSemana.proporcao,
      amostras: datas.length,
    });
  }

  if (fimDoMes >= CONFIANCA_MINIMA) {
    candidatos.push({
      tipo: 'fim-do-mes',
      descricao: 'no fim do mês',
      diaTipico: 30,
      confianca: fimDoMes,
      amostras: datas.length,
    });
  }

  if (!candidatos.length) {
    const mediaDia = Math.round(dias.reduce((s, d) => s + d, 0) / dias.length);
    return { ...vazio, descricao: `varia (perto do dia ${mediaDia})`, diaTipico: mediaDia };
  }

  // empate: prefere a regra mais consistente; se empatar, a mais específica
  const peso = (p: PadraoPagamento) => p.confianca + (p.tipo === 'dia-fixo' ? 0.01 : 0);
  return candidatos.sort((a, b) => peso(b) - peso(a))[0];
}
