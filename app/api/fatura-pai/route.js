import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

// GET /api/fatura-pai?card_id=1&month=2026-07  -> { ok, total_pai }
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const cardId = Number(searchParams.get('card_id'));
  const month = (searchParams.get('month') || '').slice(0, 7);
  if (!cardId || !/^\d{4}-\d{2}$/.test(month)) return NextResponse.json({ ok: false, erro: 'Parâmetros inválidos.' }, { status: 400 });

  const sb = supabaseServer();
  const { data, error } = await sb.from('v_card_invoice_items').select('amount_pai').eq('card_id', cardId).eq('bill_month', `${month}-01`);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  const total_pai = (data || []).reduce((s, it) => s + Number(it.amount_pai || 0), 0);
  return NextResponse.json({ ok: true, total_pai });
}
