import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const { card_id, description, purchased_at, installment_amount, installments_count, first_billed_month } = b;

  if (!card_id || !description || !purchased_at || !installment_amount || !installments_count || !first_billed_month) {
    return NextResponse.json({ ok: false, erro: 'Preencha todos os campos.' }, { status: 400 });
  }

  const sb = supabaseServer();
  const { error } = await sb.from('card_purchases').insert({
    card_id: Number(card_id),
    description: String(description).trim(),
    purchased_at,
    installment_amount: Number(installment_amount),
    installments_count: Number(installments_count),
    first_billed_month,
  });

  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
