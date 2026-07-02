import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';
import { ocorrenciasNoMes } from '../../../lib/recurring';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const month = (b.month || '').slice(0, 7); // YYYY-MM
  if (!/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ ok: false, erro: 'Mês inválido.' }, { status: 400 });

  const sb = supabaseServer();
  const [{ data: bills }, { data: existentes }] = await Promise.all([
    sb.from('recurring_bills').select('*').eq('active', true),
    sb.from('cashbook').select('details, entry_date, kind').gte('entry_date', `${month}-01`).lte('entry_date', `${month}-31`),
  ]);

  const chave = (nome, data) => `${(nome || '').trim().toLowerCase()}|${(data || '').slice(0, 10)}`;
  const jaTem = new Set((existentes || []).filter((e) => e.kind === 'saida').map((e) => chave(e.details, e.entry_date)));

  const novos = [];
  (bills || []).forEach((bill) => {
    ocorrenciasNoMes(bill, month).forEach((data) => {
      if (jaTem.has(chave(bill.name, data))) return;
      novos.push({
        entry_date: data,
        details: bill.name,
        category: bill.category || 'Outros',
        amount: Math.abs(Number(bill.amount) || 0),
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
