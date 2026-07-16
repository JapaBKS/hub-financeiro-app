import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

// POST { id }              -> exclui um provento
// POST { month:'YYYY-MM' } -> exclui todos os proventos daquele mês (pra reimportar da B3)
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const sb = supabaseServer();

  if (b.id != null) {
    const { error } = await sb.from('dividends').delete().eq('id', b.id);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (b.month && /^\d{4}-\d{2}$/.test(b.month)) {
    const { error } = await sb.from('dividends').delete()
      .gte('paid_at', `${b.month}-01`).lte('paid_at', `${b.month}-31`);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, erro: 'Informe id ou month.' }, { status: 400 });
}
