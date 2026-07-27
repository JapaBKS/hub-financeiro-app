import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const ticker = (b.ticker || '').toUpperCase().trim();
  const price = Number(String(b.price).replace(',', '.'));
  if (!ticker || !(price > 0)) return NextResponse.json({ ok: false, erro: 'Dados inválidos.' }, { status: 400 });
  const sb = supabaseServer();
  const { error } = await sb.from('manual_prices').upsert(
    { ticker, price, updated_at: new Date().toISOString() }, { onConflict: 'ticker' });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const b = await req.json().catch(() => ({}));
  const ticker = (b.ticker || '').toUpperCase().trim();
  if (!ticker) return NextResponse.json({ ok: false, erro: 'Ticker ausente.' }, { status: 400 });
  const sb = supabaseServer();
  const { error } = await sb.from('manual_prices').delete().eq('ticker', ticker);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
