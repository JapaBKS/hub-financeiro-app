import { describe, it, expect } from 'vitest';
import { calcularHistorico, categoria } from '../lib/dominio/posicoes';

const t = (dia: string, ticker: string, side: 'compra' | 'venda', q: number, p: number, classe = 'Ações BR', id?: number) => ({
  id: id ?? null, traded_at: dia, side, quantity: q, price: p, assets: { ticker, asset_classes: { name: classe } },
});

describe('categoria tributária', () => {
  it('ações comuns', () => expect(categoria('PETR4', 'Ações BR')).toBe('acao'));
  it('units da B3 são ações (têm a isenção de R$ 20 mil)', () => {
    expect(categoria('TAEE11', 'Ações BR')).toBe('acao');
    expect(categoria('KLBN11', 'Ações BR')).toBe('acao');
  });
  it('ETF de ações continua ETF', () => {
    expect(categoria('BOVA11', 'Ações BR')).toBe('etf');
    expect(categoria('VWRA11', 'Global')).toBe('etf');
  });
  it('ETF de renda fixa tem categoria própria (imposto retido na fonte)', () => {
    expect(categoria('B5P211', 'Tesouro')).toBe('etf_rf');
    expect(categoria('IMAB11', 'Tesouro')).toBe('etf_rf');
  });
  it('BDR', () => expect(categoria('AAPL34', 'Global')).toBe('bdr'));
  it('FII pela classe', () => expect(categoria('XPML11', 'FIIS')).toBe('fii'));
  it('cripto pela classe', () => expect(categoria('BTC', 'BTC')).toBe('cripto'));
});

describe('custo médio e vendas', () => {
  it('custo médio ponderado nas compras', () => {
    const { posicoes } = calcularHistorico([
      t('2026-01-10', 'PETR4', 'compra', 100, 30),
      t('2026-02-10', 'PETR4', 'compra', 100, 40),
    ], []);
    expect(posicoes.PETR4.quantidade).toBe(200);
    expect(posicoes.PETR4.precoMedio).toBeCloseTo(35, 6);
  });

  it('venda realiza (preço − PM) e não muda o PM do que sobra', () => {
    const { posicoes, vendas } = calcularHistorico([
      t('2026-01-10', 'PETR4', 'compra', 100, 30),
      t('2026-01-20', 'PETR4', 'compra', 100, 40),
      t('2026-03-05', 'PETR4', 'venda', 50, 45),
    ], []);
    expect(vendas).toHaveLength(1);
    expect(vendas[0].resultado).toBeCloseTo(50 * (45 - 35), 6);
    expect(vendas[0].mes).toBe('2026-03');
    expect(posicoes.PETR4.quantidade).toBe(150);
    expect(posicoes.PETR4.precoMedio).toBeCloseTo(35, 6);
  });

  it('desdobramento multiplica a quantidade e mantém o custo total', () => {
    const { posicoes } = calcularHistorico(
      [t('2026-01-10', 'ITSA4', 'compra', 100, 10)],
      [{ ticker: 'ITSA4', event_date: '2026-02-01', fator: 2, tipo: 'desdobramento' }],
    );
    expect(posicoes.ITSA4.quantidade).toBe(200);
    expect(posicoes.ITSA4.custoTotal).toBeCloseTo(1000, 6);
    expect(posicoes.ITSA4.precoMedio).toBeCloseTo(5, 6);
  });
});
