import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

// POST   { ticker, event_date, tipo, fator, nota }
// DELETE { id }
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const ticker = String(b.ticker || '').toUpperCase().trim();
  const event_date = String(b.event_date || '').slice(0, 10);
  const fator = Number(String(b.fator).replace(',', '.'));

  if (!ticker) return NextResponse.json({ ok: false, erro: 'Informe o ticker.' }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event_date)) return NextResponse.json({ ok: false, erro: 'Data inválida.' }, { status: 400 });
  if (!(fator > 0)) return NextResponse.json({ ok: false, erro: 'Fator deve ser maior que zero.' }, { status: 400 });

  const sb = supabaseServer();
  const { error } = await sb.from('corporate_events').insert({
    ticker, event_date, fator,
    tipo: String(b.tipo || 'desdobramento'),
    nota: b.nota ? String(b.nota) : null,
  });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  if (!id) return NextResponse.json({ ok: false, erro: 'Id ausente.' }, { status: 400 });
  const sb = supabaseServer();
  const { error } = await sb.from('corporate_events').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
