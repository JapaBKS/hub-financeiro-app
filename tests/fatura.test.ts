import { describe, it, expect } from 'vitest';
import { dataFechamento, mesDaFatura } from '../lib/dominio/fatura';

const nubank = { due_day: 16, closing_day: 9 };
const inter = { due_day: 1, closing_day: 24 };

describe('fechamento da fatura', () => {
  it('fecha no mês do vencimento quando o fechamento vem antes', () => {
    expect(dataFechamento(nubank, '2026-11-01')).toBe('2026-11-09');
  });
  it('fecha no mês anterior quando vence no começo do mês', () => {
    expect(dataFechamento(inter, '2026-12-01')).toBe('2026-11-24');
  });
  it('compra antes do fechamento cai na fatura do mês', () => {
    expect(mesDaFatura(nubank, '2026-11-08')).toBe('2026-11');
    expect(mesDaFatura(inter, '2026-11-23')).toBe('2026-12');
  });
  it('compra no dia do fechamento ou depois vai para a próxima', () => {
    expect(mesDaFatura(nubank, '2026-11-09')).toBe('2026-12');
    expect(mesDaFatura(inter, '2026-11-24')).toBe('2027-01');
  });
  it('sem fechamento cadastrado usa a regra antiga', () => {
    expect(mesDaFatura({ due_day: 1 }, '2026-11-10')).toBe('2026-12');
    expect(mesDaFatura({ due_day: 20 }, '2026-11-10')).toBe('2026-11');
  });
});
