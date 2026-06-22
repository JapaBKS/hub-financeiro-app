import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const { ticker, classId, side, traded_at, quantity, price } = b;

  if (!ticker || !side || !traded_at || !quantity || !price) {
    return NextResponse.json({ ok: false, erro: 'Preencha todos os campos.' }, { status: 400 });
  }

  const sb = supabaseServer();
  const tk = String(ticker).trim().toUpperCase();

  // Acha o ativo; se não existir, cria (precisa da classe).
  let { data: asset } = await sb.from('assets').select('id').eq('ticker', tk).maybeSingle();

  if (!asset) {
    if (!classId) {
      return NextResponse.json({ ok: false, erro: 'Ativo novo: escolha a classe.' }, { status: 400 });
    }
    const { data: novo, error } = await sb
      .from('assets')
      .insert({ ticker: tk, class_id: Number(classId), is_active: true })
      .select('id')
      .single();
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
    asset = novo;
  }

  const { error: e2 } = await sb.from('trades').insert({
    asset_id: asset.id,
    traded_at,
    side,
    quantity: Number(quantity),
    price: Number(price),
  });
  if (e2) return NextResponse.json({ ok: false, erro: e2.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ ok: false, erro: 'id ausente' }, { status: 400 });

  const sb = supabaseServer();
  const { error } = await sb.from('trades').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
