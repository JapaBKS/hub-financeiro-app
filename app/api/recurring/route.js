import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

function normalize(b) {
  const kind = b.schedule_kind === 'semanal' ? 'semanal' : 'dia_mes';
  return {
    name: (b.name || '').trim(),
    category: (b.category || 'Outros').trim() || 'Outros',
    amount: Math.abs(Number(b.amount) || 0),
    schedule_kind: kind,
    day_of_month: kind === 'dia_mes' ? Math.min(31, Math.max(1, Number(b.day_of_month) || 1)) : null,
    weekday: kind === 'semanal' ? Math.min(6, Math.max(0, Number(b.weekday) || 0)) : null,
    is_variable: !!b.is_variable,
    card_id: b.card_id ? Number(b.card_id) : null,
    active: b.active !== false,
  };
}

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const row = normalize(b);
  if (!row.name) return NextResponse.json({ ok: false, erro: 'Nome é obrigatório.' }, { status: 400 });
  const sb = supabaseServer();
  const { error } = await sb.from('recurring_bills').insert(row);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, erro: 'id ausente.' }, { status: 400 });
  const sb = supabaseServer();
  // toggle rápido de ativo
  if (b.onlyActive != null) {
    const { error } = await sb.from('recurring_bills').update({ active: !!b.onlyActive }).eq('id', b.id);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  const { error } = await sb.from('recurring_bills').update(normalize(b)).eq('id', b.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const b = await req.json().catch(() => ({}));
  if (!b.id) return NextResponse.json({ ok: false, erro: 'id ausente.' }, { status: 400 });
  const sb = supabaseServer();
  const { error } = await sb.from('recurring_bills').delete().eq('id', b.id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
