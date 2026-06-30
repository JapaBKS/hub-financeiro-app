import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

const chave = (t, d, k) => `${t}|${(d || '').slice(0, 10)}|${k}`;

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const itens = Array.isArray(b.itens) ? b.itens : null;
  if (!itens || !itens.length) return NextResponse.json({ ok: false, erro: 'Lista vazia.' }, { status: 400 });

  const sb = supabaseServer();
  const { data: assets } = await sb.from('assets').select('id, ticker');
  const idDe = {};
  (assets || []).forEach((a) => { idDe[a.ticker] = a.id; });

  // o que já existe nas datas importadas (dedup por ticker+data+tipo, ignorando valor)
  const datas = [...new Set(itens.map((i) => (i.paid_at || '').slice(0, 10)))];
  const { data: existentes } = await sb.from('dividends').select('ticker, paid_at, kind').in('paid_at', datas);
  const jaTem = new Set((existentes || []).map((d) => chave(d.ticker, d.paid_at, d.kind)));

  const novos = [];
  const vistos = new Set(); // dedup exato dentro da própria importação
  for (const it of itens) {
    if (!it.ticker || !it.paid_at) continue;
    const kDB = chave(it.ticker, it.paid_at, it.kind);
    const kExato = kDB + '|' + Number(it.amount);
    if (jaTem.has(kDB) || vistos.has(kExato)) continue;
    vistos.add(kExato);
    novos.push({ ticker: it.ticker, asset_id: idDe[it.ticker] || null, paid_at: it.paid_at, kind: it.kind, amount: Number(it.amount) });
  }

  if (novos.length) {
    const { error } = await sb.from('dividends').insert(novos);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, inseridos: novos.length, ignorados: itens.length - novos.length });
}
