import { describe, it, expect } from 'vitest';
import { numeroBR } from '../lib/format';
import { somarDias } from '../lib/dominio/datas';
import { numero, data, ErroDeUso } from '../lib/api';
import { criarResolvedorDePreco } from '../lib/dominio/precos';
import { distribuirAporte } from '../lib/dominio/aporte';

describe('números digitados no padrão brasileiro', () => {
  it.each([
    ['45,90', 45.9], ['45.90', 45.9], ['1.234,56', 1234.56], ['R$ 1.000,00', 1000], ['15000', 15000],
  ])('%s → %s', (txt, esperado) => expect(numeroBR(txt)).toBeCloseTo(esperado as number, 6));
  it('vazio ou texto vira NaN (a tela recusa em vez de salvar zero)', () => {
    expect(numeroBR('')).toBeNaN();
    expect(numeroBR('abc')).toBeNaN();
  });
});

describe('datas', () => {
  it('somarDias atravessa mês e ano', () => {
    expect(somarDias('2026-12-30', 3)).toBe('2027-01-02');
    expect(somarDias('2026-02-27', 2)).toBe('2026-03-01');
  });
});

describe('validadores das APIs', () => {
  it('parcela 0 é válida (a 1ª parcela da view é a de índice 0)', () => {
    expect(numero(0, 'A parcela', { min: 0, inteiro: true })).toBe(0);
  });
  it('número inválido lança erro de uso', () => {
    expect(() => numero('x', 'O valor')).toThrow(ErroDeUso);
  });
  it('data precisa ser AAAA-MM-DD', () => {
    expect(data('2026-11-01', 'A data')).toBe('2026-11-01');
    expect(() => data('-01', 'A data')).toThrow(ErroDeUso);
  });
});

describe('preço usado nas telas', () => {
  const agora = new Date().toISOString();
  const antigo = new Date(Date.now() - 5 * 86400e3).toISOString();
  it('cotação recente vence o manual', () => {
    const r = criarResolvedorDePreco([{ ticker: 'PETR4', price: 30, updated_at: agora }], [{ ticker: 'PETR4', price: 35 }]);
    expect(r('PETR4', 20)).toMatchObject({ preco: 30, origem: 'auto' });
  });
  it('manual vence cotação antiga', () => {
    const r = criarResolvedorDePreco([{ ticker: 'PETR4', price: 30, updated_at: antigo }], [{ ticker: 'PETR4', price: 35 }]);
    expect(r('PETR4', 20)).toMatchObject({ preco: 35, origem: 'manual' });
  });
  it('sem nada, usa o preço médio', () => {
    const r = criarResolvedorDePreco([], []);
    expect(r('PETR4', 20)).toMatchObject({ preco: 20, origem: 'pm' });
  });
});

describe('divisão do aporte', () => {
  it('reparte pelo tamanho do buraco e não passa do buraco', () => {
    const r: Record<string, number> = distribuirAporte([
      { ticker: 'A', buraco: 300, preco: 1, inteiro: false },
      { ticker: 'B', buraco: 100, preco: 1, inteiro: false },
    ], 200);
    expect(r.A).toBeCloseTo(150, 6);
    expect(r.B).toBeCloseTo(50, 6);
    const sobra: Record<string, number> = distribuirAporte([{ ticker: 'A', buraco: 100, preco: 1, inteiro: false }], 500);
    expect(sobra.A).toBeCloseTo(100, 6);
  });
});
