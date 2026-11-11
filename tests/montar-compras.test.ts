import { describe, it, expect } from 'vitest';
import { montarCompras } from '../lib/dominio/montar-compras';

const item = (ticker: string, buraco: number, preco: number) => ({
  ticker, acao: 'comprar', sugestaoRs: buraco, precoUnit: preco, inteiro: true, nova: false, atencao: false,
});
const reserva = (falta: number) => ({ nome: 'Reserva', alvo: 15000, falta, saldo: 15000 - falta });

describe('troco das cotas inteiras', () => {
  it('compra só cotas inteiras e manda o troco para a reserva', () => {
    const r: any = montarCompras([item('A', 1000, 70), item('B', 1000, 90)] as any, 300, reserva(1000) as any);
    const gasto = r.comprar.filter((i: any) => !i.reserva).reduce((t: number, i: any) => t + i.sugestaoRs, 0);
    expect(gasto % 10).toBe(0); // múltiplos dos preços (70 e 90)
    expect(gasto + r.reservaAporte + r.sobra).toBeCloseTo(300, 2);
    expect(r.sobra).toBe(0);
  });
  it('com a reserva no alvo, o troco sobra para o próximo mês', () => {
    const r: any = montarCompras([item('A', 1000, 70)] as any, 100, reserva(0) as any);
    expect(r.comprar[0].sugestaoRs).toBe(70);
    expect(r.reservaAporte).toBe(0);
    expect(r.sobra).toBeCloseTo(30, 2);
  });
});
