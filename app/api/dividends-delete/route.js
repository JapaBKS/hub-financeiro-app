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
    const [y, m] = b.month.split('-').map(Number);
    const inicio = `${b.month}-01`;
    // primeiro dia do mês seguinte (data sempre válida, evita "31 de setembro")
    const proximo = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const { error } = await sb.from('dividends').delete()
      .gte('paid_at', inicio).lt('paid_at', proximo);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, erro: 'Informe id ou month.' }, { status: 400 });
}
