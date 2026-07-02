import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const row = {
    entry_date: b.entry_date,
    details: (b.details || '').trim(),
    category: (b.category || 'Outros').trim() || 'Outros',
    amount: Math.abs(Number(b.amount) || 0),
    kind: b.kind === 'entrada' ? 'entrada' : 'saida',
    paid: b.paid !== false,
  };
  if (!row.entry_date || !row.amount) return NextResponse.json({ ok: false, erro: 'Data e valor são obrigatórios.' }, { status: 400 });
  const sb = supabaseServer();
  const { error } = await sb.from('cashbook').insert(row);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, erro: 'id ausente.' }, { status: 400 });
  const patch = {};
  if (b.entry_date != null) patch.entry_date = b.entry_date;
  if (b.details != null) patch.details = String(b.details).trim();
  if (b.category != null) patch.category = String(b.category).trim() || 'Outros';
  if (b.amount != null) patch.amount = Math.abs(Number(b.amount) || 0);
  if (b.kind != null) patch.kind = b.kind === 'entrada' ? 'entrada' : 'saida';
  if (b.paid != null) patch.paid = !!b.paid;
  const sb = supabaseServer();
  const { error } = await sb.from('cashbook').update(patch).eq('id', b.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, erro: 'id ausente.' }, { status: 400 });
  const sb = supabaseServer();
  const { error } = await sb.from('cashbook').delete().eq('id', b.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
