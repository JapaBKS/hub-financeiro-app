// Regras de apuração mensal (renda variável), usadas pela Apuração e pelo relatório de IR.

export const LIMITE_ISENCAO_ACOES = 20000; // vendas de ações no mês até este valor: lucro isento
export const LIMITE_ISENCAO_CRIPTO = 35000;

// Agrupa as vendas (de calcularHistorico) por mês e por grupo de tributação.
export function agruparVendasPorMes(vendas) {
  const meses = {};
  for (const v of vendas) {
    const M = (meses[v.mes] ||= {
      mes: v.mes,
      vendasAcao: 0, vendasBdrEtf: 0, vendasFii: 0, vendasCripto: 0, vendasRf: 0,
      resAcao: 0, resBdrEtf: 0, resFii: 0, resCripto: 0, resRf: 0,
      vendas: [],
    });
    // cada grupo apura separado: FII (20%), cripto (regra própria) e o resto (15%)
    if (v.cat === 'fii') { M.vendasFii += v.bruto; M.resFii += v.resultado; }
    else if (v.cat === 'cripto') { M.vendasCripto += v.bruto; M.resCripto += v.resultado; }
    // ETF de renda fixa: imposto já retido na fonte; fica só informativo, fora da compensação
    else if (v.cat === 'etf_rf') { M.vendasRf += v.bruto; M.resRf += v.resultado; }
    else if (v.cat === 'acao') { M.vendasAcao += v.bruto; M.resAcao += v.resultado; }
    else { M.vendasBdrEtf += v.bruto; M.resBdrEtf += v.resultado; }
    M.vendas.push(v);
  }
  return Object.values(meses)
    .map((m) => ({ ...m, vendas: m.vendas.sort((a, b) => a.dia.localeCompare(b.dia)) }))
    .sort((a, b) => b.mes.localeCompare(a.mes));
}

// Compensa prejuízos mês a mês (em ordem cronológica). Devolve, por mês, o prejuízo
// acumulado a compensar depois dele e o imposto devido.
export function compensarPrejuizos(meses) {
  const cron = [...meses].sort((a, b) => a.mes.localeCompare(b.mes));
  let saldoRV = 0, saldoFii = 0; // prejuízo disponível (positivo = tem a usar)
  const acumulado = {};
  cron.forEach((m) => {
    const isentoAcao = m.vendasAcao > 0 && m.vendasAcao <= LIMITE_ISENCAO_ACOES;
    // lucro de ação em mês isento (vendas até R$ 20 mil) não é tributado, mas o prejuízo
    // desse mês continua podendo ser compensado depois
    const rvMes = (isentoAcao ? Math.min(0, m.resAcao) : m.resAcao) + m.resBdrEtf;

    let tribRV = 0;
    if (rvMes >= 0) { tribRV = Math.max(0, rvMes - saldoRV); saldoRV = Math.max(0, saldoRV - rvMes); }
    else { saldoRV += -rvMes; }

    let tribFii = 0;
    if (m.resFii >= 0) { tribFii = Math.max(0, m.resFii - saldoFii); saldoFii = Math.max(0, saldoFii - m.resFii); }
    else { saldoFii += -m.resFii; }

    acumulado[m.mes] = {
      rv: saldoRV, fii: saldoFii, rvMes, isentoAcao,
      lucroIsentoAcao: isentoAcao && m.resAcao > 0 ? m.resAcao : 0,
      impostoRV: tribRV * 0.15,
      impostoFii: tribFii * 0.20,
    };
  });
  return { cron, acumulado };
}
