import { describe, it, expect } from 'vitest';
import { agruparVendasPorMes, compensarPrejuizos } from '../lib/dominio/apuracao';

const v = (mes: string, cat: string, bruto: number, resultado: number) => ({ mes, dia: `${mes}-10`, cat, bruto, resultado });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const apurar = (vendas: ReturnType<typeof v>[]) => compensarPrejuizos(agruparVendasPorMes(vendas)).acumulado as Record<string, any>;

describe('apuração mensal', () => {
  it('ação com vendas até R$ 20 mil no mês: lucro isento', () => {
    const a = apurar([v('2026-03', 'acao', 15000, 2000)]);
    expect(a['2026-03'].impostoRV).toBe(0);
    expect(a['2026-03'].lucroIsentoAcao).toBe(2000);
  });

  it('ação com vendas acima de R$ 20 mil: 15% sobre o lucro', () => {
    const a = apurar([v('2026-03', 'acao', 25000, 2000)]);
    expect(a['2026-03'].impostoRV).toBeCloseTo(300, 6);
  });

  it('BDR não tem isenção: 15% mesmo com venda pequena', () => {
    const a = apurar([v('2026-03', 'bdr', 3000, 200)]);
    expect(a['2026-03'].impostoRV).toBeCloseTo(30, 6);
  });

  it('ETF de renda fixa não gera DARF (imposto retido na fonte)', () => {
    const a = apurar([v('2026-10', 'etf_rf', 5000, 400), v('2026-10', 'bdr', 3000, 200)]);
    expect(a['2026-10'].impostoRV).toBeCloseTo(30, 6); // só o BDR
  });

  it('FII: 20% e prejuízo separado das ações', () => {
    const a = apurar([v('2026-01', 'acao', 30000, -1000), v('2026-02', 'fii', 5000, 500)]);
    expect(a['2026-02'].impostoFii).toBeCloseTo(100, 6); // prejuízo de ação não abate FII
    expect(a['2026-02'].rv).toBeCloseTo(1000, 6);
  });

  it('prejuízo de mês isento continua compensável', () => {
    const a = apurar([v('2026-01', 'acao', 10000, -3000), v('2026-02', 'acao', 40000, 5000)]);
    expect(a['2026-01'].rv).toBeCloseTo(3000, 6);
    expect(a['2026-02'].impostoRV).toBeCloseTo((5000 - 3000) * 0.15, 6);
    expect(a['2026-02'].rv).toBe(0);
  });

  it('prejuízo de BDR abate lucro de ação tributável', () => {
    const a = apurar([v('2026-01', 'bdr', 5000, -800), v('2026-02', 'acao', 30000, 1000)]);
    expect(a['2026-02'].impostoRV).toBeCloseTo(200 * 0.15, 6);
  });
});
