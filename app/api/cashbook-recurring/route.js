import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';
import { ocorrenciasNoMes } from '../../../lib/recurring';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const month = (b.month || '').slice(0, 7); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ ok: false, erro: 'Mês inválido.' }, { status: 400 });

  const sb = supabaseServer();
  const [{ data: bills }, { data: existentes }, { data: itensFatura }] = await Promise.all([
    sb.from('recurring_bills').select('*').eq('active', true),
    sb.from('cashbook').select('details, entry_date, kind').gte('entry_date', `${month}-01`).lte('entry_date', `${month}-31`),
    sb.from('v_card_invoice_items').select('card_id, amount_pai').eq('bill_month', `${month}-01`),
  ]);

  // parte do pai por cartão naquele mês (soma de amount_pai)
  const paiPorCartao = {};
  (itensFatura || []).forEach((it) => {
    paiPorCartao[it.card_id] = (paiPorCartao[it.card_id] || 0) + Number(it.amount_pai || 0);
  });

  const chave = (nome, data) => `${(nome || '').trim().toLowerCase()}|${(data || '').slice(0, 10)}`;
  const jaTem = new Set((existentes || []).filter((e) => e.kind === 'saida').map((e) => chave(e.details, e.entry_date)));

  const novos = [];
  (bills || []).forEach((bill) => {
    // valor sugerido: se ligada a um cartão e a fatura tem parte do pai, usa ela; senão o valor padrão
    let valor = Math.abs(Number(bill.amount) || 0);
    if (bill.card_id != null && paiPorCartao[bill.card_id] > 0) {
      valor = paiPorCartao[bill.card_id];
    }
    ocorrenciasNoMes(bill, month).forEach((data) => {
      if (jaTem.has(chave(bill.name, data))) return;
      novos.push({
        entry_date: data,
        details: bill.name,
        category: bill.category || 'Outros',
        amount: valor,
        kind: 'saida',
        paid: false,
        needs_review: !!bill.is_variable,
      });
    });
  });

  if (novos.length) {
    const { error } = await sb.from('cashbook').insert(novos);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, inseridos: novos.length });
}
