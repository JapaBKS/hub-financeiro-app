import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';
import { ocorrenciasNoMes } from '../../../lib/recurring';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const month = (b.month || '').slice(0, 7); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ ok: false, erro: 'Mês inválido.' }, { status: 400 });

  // fim do intervalo = 1º dia do mês seguinte (exclusivo). Antes era `${month}-31`, data que
  // NÃO existe em nov/abr/jun/set/fev: o banco rejeitava a consulta, `existentes` vinha vazio
  // e as fixas eram inseridas de novo a cada clique.
  const [ano, mes] = month.split('-').map(Number);
  const proximo = new Date(Date.UTC(ano, mes, 1)).toISOString().slice(0, 10);

  const sb = supabaseServer();
  const [{ data: bills }, { data: existentes, error: erroExistentes }, { data: itensFatura }] = await Promise.all([
    sb.from('recurring_bills').select('*').eq('active', true),
    sb.from('cashbook').select('details, entry_date, kind').gte('entry_date', `${month}-01`).lt('entry_date', proximo),
    sb.from('v_card_invoice_items').select('card_id, amount_pai').eq('bill_month', `${month}-01`),
  ]);

  // parte do pai por cartão naquele mês (soma de amount_pai)
  const paiPorCartao = {};
  (itensFatura || []).forEach((it) => {
    paiPorCartao[it.card_id] = (paiPorCartao[it.card_id] || 0) + Number(it.amount_pai || 0);
  });

  // sem conseguir ler o que já existe, não insere nada (melhor falhar do que duplicar)
  if (erroExistentes) return NextResponse.json({ ok: false, erro: erroExistentes.message }, { status: 500 });

  // quantas saídas com o mesmo nome já existem no mês — vale o nome, não a data, para não duplicar
  // quando você mudou o dia ou o vencimento de uma conta depois de aberta
  const jaTemPorNome = {};
  (existentes || []).filter((e) => e.kind === 'saida').forEach((e) => {
    const k = (e.details || '').trim().toLowerCase();
    jaTemPorNome[k] = (jaTemPorNome[k] || 0) + 1;
  });

  const novos = [];
  (bills || []).forEach((bill) => {
    // valor sugerido: se ligada a um cartão e a fatura tem parte do pai, usa ela; senão o valor padrão
    let valor = Math.abs(Number(bill.amount) || 0);
    if (bill.card_id != null && paiPorCartao[bill.card_id] > 0) {
      valor = paiPorCartao[bill.card_id];
    }
    const nomeKey = (bill.name || '').trim().toLowerCase();
    ocorrenciasNoMes(bill, month).forEach((data) => {
      if (jaTemPorNome[nomeKey] > 0) { jaTemPorNome[nomeKey] -= 1; return; } // essa ocorrência já está lançada
      novos.push({
        entry_date: data,
        details: bill.name,
        category: bill.category || 'Outros',
        amount: valor,
        kind: 'saida',
        paid: false,
        needs_review: !!bill.is_variable,
        card_id: bill.card_id != null ? bill.card_id : null,
      });
    });
  });

  if (novos.length) {
    const { error } = await sb.from('cashbook').insert(novos);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, inseridos: novos.length });
}
