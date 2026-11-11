import { lerTudo } from './supabase';

// Faturas (só a sua parte) que cada salário cobre, ainda não pagas:
//  · salário do dia 15 → cartões que vencem do dia 15 em diante, fatura do mês;
//  · salário do dia 30 → cartões que vencem no início do mês (Inter, dia 1), fatura do mês seguinte.
export async function faturasPorSalario(sb) {
  const [{ data: cartoes }, { data: itensFatura }, { data: pagFaturas }] = await Promise.all([
    sb.from('cards').select('id, name, due_day'),
    lerTudo((de, ate) => sb.from('v_card_invoice_items').select('card_id, bill_month, amount, amount_pai').order('purchase_id').order('parcela_idx').range(de, ate)),
    sb.from('invoice_payments').select('card_id, bill_month'),
  ]);
  const spAgora = new Date(Date.now() - 3 * 3600 * 1000); // horário de Brasília
  const mesIso = (d) => d.toISOString().slice(0, 7) + '-01';
  const mesCorrente = mesIso(spAgora);
  const mesSeguinte = mesIso(new Date(Date.UTC(spAgora.getUTCFullYear(), spAgora.getUTCMonth() + 1, 1)));
  const pagasSet = new Set((pagFaturas || []).map((p) => `${p.card_id}|${String(p.bill_month).slice(0, 10)}`));
  const faturasDe = (cartaoFiltro, mes) => (cartoes || []).filter(cartaoFiltro).map((c) => {
    const valor = (itensFatura || [])
      .filter((i) => i.card_id === c.id && String(i.bill_month).slice(0, 10) === mes)
      .reduce((t, i) => t + Number(i.amount) - Number(i.amount_pai || 0), 0);
    return { nome: c.name, valor: pagasSet.has(`${c.id}|${mes}`) ? 0 : Math.round(valor * 100) / 100 };
  }).filter((f) => f.valor > 0);
  return {
    faturasDia15: faturasDe((c) => Number(c.due_day) >= 15, mesCorrente),
    faturasDia30: faturasDe((c) => Number(c.due_day) < 15, mesSeguinte),
    diaInicial: spAgora.getUTCDate() >= 23 ? 30 : 15,
  };
}
