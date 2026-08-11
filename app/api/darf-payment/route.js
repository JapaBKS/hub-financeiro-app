import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

// POST   { mes:'YYYY-MM', valor } -> marca como paga
// DELETE { mes:'YYYY-MM' }        -> desfaz
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const mes = String(b.mes || '');
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ ok: false, erro: 'Mês inválido.' }, { status: 400 });
  }
  const sb = supabaseServer();
  const { error } = await sb.from('darf_payments').upsert(
    { mes_apuracao: mes, paid_at: new Date().toISOString().slice(0, 10), valor: Number(b.valor) || null },
    { onConflict: 'mes_apuracao' },
  );
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const b = await req.json().catch(() => ({}));
  const mes = String(b.mes || '');
  if (!/^\d{4}-\d{2}$/.test(mes)) {
    return NextResponse.json({ ok: false, erro: 'Mês inválido.' }, { status: 400 });
  }
  const sb = supabaseServer();
  const { error } = await sb.from('darf_payments').delete().eq('mes_apuracao', mes);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
