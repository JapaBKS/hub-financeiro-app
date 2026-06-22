import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST(req) {
  const { label, class_id, amount } = await req.json().catch(() => ({}));
  if (!label || !class_id || amount == null || amount === '') {
    return NextResponse.json({ ok: false, erro: 'Preencha nome, classe e valor.' }, { status: 400 });
  }
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('manual_holdings')
    .insert({ label: String(label).trim(), class_id: Number(class_id), amount: Number(amount) })
    .select('id')
    .single();
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req) {
  const { id, label, amount } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, erro: 'id ausente' }, { status: 400 });
  const patch = { updated_at: new Date().toISOString() };
  if (label) patch.label = String(label).trim();
  if (amount != null && amount !== '') patch.amount = Number(amount);
  const sb = supabaseServer();
  const { error } = await sb.from('manual_holdings').update(patch).eq('id', id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, erro: 'id ausente' }, { status: 400 });
  const sb = supabaseServer();
  const { error } = await sb.from('manual_holdings').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
