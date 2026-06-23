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
    categoria: b.categoria || null,
    pagador: b.pagador === 'pai' ? 'pai' : 'eu',
    purchased_at,
    installment_amount: Number(installment_amount),
    installments_count: Number(installments_count),
    first_billed_month,
  });

  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, erro: 'id ausente' }, { status: 400 });
  const sb = supabaseServer();
  const { error } = await sb.from('card_purchases').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req) {
  const b = await req.json().catch(() => ({}));
  const { id } = b;
  if (!id) return NextResponse.json({ ok: false, erro: 'id ausente' }, { status: 400 });

  const patch = {};
  if (b.card_id) patch.card_id = Number(b.card_id);
  if (b.description) patch.description = String(b.description).trim();
  if (b.installment_amount != null && b.installment_amount !== '') patch.installment_amount = Number(b.installment_amount);
  if (b.installments_count != null && b.installments_count !== '') patch.installments_count = Number(b.installments_count);
  if (b.first_billed_month) patch.first_billed_month = b.first_billed_month;
  if (b.categoria !== undefined) patch.categoria = b.categoria || null;
  if (b.pagador) patch.pagador = b.pagador === 'pai' ? 'pai' : 'eu';

  const sb = supabaseServer();
  const { error } = await sb.from('card_purchases').update(patch).eq('id', id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
