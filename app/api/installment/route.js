import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  if (b.purchase_id == null || b.n == null || b.amount == null) {
    return NextResponse.json({ ok: false, erro: 'Dados faltando.' }, { status: 400 });
  }
  const sb = supabaseServer();
  const { error } = await sb.from('installment_overrides').upsert(
    { purchase_id: Number(b.purchase_id), n: Number(b.n), amount: Number(b.amount) },
    { onConflict: 'purchase_id,n' }
  );
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// remove o ajuste, voltando ao valor padrão da parcela
export async function DELETE(req) {
  const b = await req.json().catch(() => ({}));
  if (b.purchase_id == null || b.n == null) {
    return NextResponse.json({ ok: false, erro: 'Dados faltando.' }, { status: 400 });
  }
  const sb = supabaseServer();
  const { error } = await sb.from('installment_overrides')
    .delete()
    .eq('purchase_id', Number(b.purchase_id))
    .eq('n', Number(b.n));
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
