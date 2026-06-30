import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

const norm = (m) => (m || '').slice(0, 10);

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (!b.card_id || !b.bill_month) {
    return NextResponse.json({ ok: false, erro: 'Dados faltando.' }, { status: 400 });
  }
  const sb = supabaseServer();
  const paid_at = b.paid_at ? norm(b.paid_at) : new Date().toISOString().slice(0, 10);
  const { error } = await sb.from('invoice_payments').upsert(
    { card_id: Number(b.card_id), bill_month: norm(b.bill_month), paid_at },
    { onConflict: 'card_id,bill_month' }
  );
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, paid_at });
}

export async function DELETE(req) {
  const b = await req.json().catch(() => ({}));
  if (!b.card_id || !b.bill_month) {
    return NextResponse.json({ ok: false, erro: 'Dados faltando.' }, { status: 400 });
  }
  const sb = supabaseServer();
  const { error } = await sb.from('invoice_payments')
    .delete()
    .eq('card_id', Number(b.card_id))
    .eq('bill_month', norm(b.bill_month));
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
