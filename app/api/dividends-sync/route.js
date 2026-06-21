import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const itens = Array.isArray(b.itens) ? b.itens : null;
  if (!itens || itens.length === 0) {
    return NextResponse.json({ ok: false, erro: 'Lista vazia.' }, { status: 400 });
  }

  const sb = supabaseServer();

  const { data: assets } = await sb.from('assets').select('id, ticker');
  const mapa = {};
  (assets || []).forEach((a) => { mapa[a.ticker] = a.id; });

  const linhas = itens.map((p) => ({
    ticker: p.ticker,
    asset_id: mapa[p.ticker] || null,
    pay_date: p.pay_date,
    kind: p.kind,
    quantity: p.quantity ?? null,
    amount_gross: p.amount_gross ?? null,
    amount: p.amount,
    classe: p.classe ?? null,
  }));

  const { error: delErr } = await sb.from('dividends_pending').delete().neq('id', 0);
  if (delErr) return NextResponse.json({ ok: false, erro: delErr.message }, { status: 500 });

  const { error: insErr } = await sb.from('dividends_pending').insert(linhas);
  if (insErr) return NextResponse.json({ ok: false, erro: insErr.message }, { status: 500 });

  const total = linhas.reduce((s, l) => s + Number(l.amount), 0);
  return NextResponse.json({ ok: true, quantidade: linhas.length, total });
}
