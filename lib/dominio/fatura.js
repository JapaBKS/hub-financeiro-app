// Fechamento da fatura. bill_month = mês do VENCIMENTO.
// Se o cartão fecha num dia menor que o do vencimento (Nubank fecha 9, vence 16), a fatura fecha
// no próprio mês do vencimento; senão (Inter fecha 24, vence 1), fecha no mês anterior.

const pad = (n) => String(n).padStart(2, '0');
const ultimoDia = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m: 1-12

function somaMes(y, m, k) {
  const t = y * 12 + (m - 1) + k;
  return [Math.floor(t / 12), (t % 12) + 1];
}

// O fechamento pode ser cadastrado de dois jeitos:
//  - fecha_dias_antes: N dias corridos antes do vencimento (Nubank e Inter 7, Mercado Pago 5)
//  - closing_day: dia fixo do mês (para quem varia, como a Rico, ajustando quando mudar)
export const temFechamento = (card) => Number(card?.fecha_dias_antes) > 0 || Number(card?.closing_day) > 0;

// data (AAAA-MM-DD) em que a fatura do mês `billMonth` (AAAA-MM...) fecha; null sem fechamento
export function dataFechamento(card, billMonth) {
  const [y0, m0] = String(billMonth).slice(0, 7).split('-').map(Number);
  const antes = Number(card?.fecha_dias_antes);
  if (antes > 0) {
    const venc = new Date(Date.UTC(y0, m0 - 1, Math.min(Number(card.due_day), ultimoDia(y0, m0))));
    venc.setUTCDate(venc.getUTCDate() - antes);
    return venc.toISOString().slice(0, 10);
  }
  const fecha = Number(card?.closing_day);
  if (!fecha) return null;
  const [y, m] = fecha < Number(card.due_day) ? [y0, m0] : somaMes(y0, m0, -1);
  return `${y}-${pad(m)}-${pad(Math.min(fecha, ultimoDia(y, m)))}`;
}

// em qual fatura (AAAA-MM) cai uma compra feita em `dataCompra`. Comprou no dia do fechamento
// ou depois, já vai para a próxima ("melhor dia de compra").
export function mesDaFatura(card, dataCompra) {
  const [y, m] = String(dataCompra).slice(0, 10).split('-').map(Number);
  if (!temFechamento(card)) {
    // sem fechamento cadastrado: regra antiga (vence no começo do mês → fatura do mês seguinte)
    const [yy, mm] = card && Number(card.due_day) < 15 ? somaMes(y, m, 1) : [y, m];
    return `${yy}-${pad(mm)}`;
  }
  for (let k = 0; k <= 2; k++) {
    const [yy, mm] = somaMes(y, m, k);
    const bill = `${yy}-${pad(mm)}`;
    if (dataFechamento(card, bill) > String(dataCompra).slice(0, 10)) return bill;
  }
  const [yy, mm] = somaMes(y, m, 2);
  return `${yy}-${pad(mm)}`;
}
