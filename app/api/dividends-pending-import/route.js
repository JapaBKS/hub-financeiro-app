import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

const chave = (t, d, k) => `${t}|${(d || '').slice(0, 10)}|${k}`;

// Importa proventos "a receber" (aba a receber da B3) -> dividends_pending
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const itens = Array.isArray(b.itens) ? b.itens : null;
  if (!itens || !itens.length) return NextResponse.json({ ok: false, erro: 'Lista vazia.' }, { status: 400 });

  const sb = supabaseServer();
  const { data: assets } = await sb.from('assets').select('id, ticker');
  const idDe = {};
  (assets || []).forEach((a) => { idDe[a.ticker] = a.id; });

  // dedup por ticker+data+tipo (ignora valor)
  const datas = [...new Set(itens.map((i) => (i.pay_date || '').slice(0, 10)))];
  const { data: existentes } = await sb.from('dividends_pending').select('ticker, pay_date, kind').in('pay_date', datas);
  const jaTem = new Set((existentes || []).map((d) => chave(d.ticker, d.pay_date, d.kind)));

  const novos = [];
  const vistos = new Set();
  for (const it of itens) {
    if (!it.ticker || !it.pay_date) continue;
    const kDB = chave(it.ticker, it.pay_date, it.kind);
    const kExato = kDB + '|' + Number(it.amount);
    if (jaTem.has(kDB) || vistos.has(kExato)) continue;
    vistos.add(kExato);
    novos.push({
      ticker: it.ticker,
      asset_id: idDe[it.ticker] || null,
      pay_date: it.pay_date,
      kind: it.kind,
      amount: Number(it.amount),
      classe: it.classe || (/11$/.test(it.ticker) ? 'fiis' : 'acoes'),
    });
  }

  if (novos.length) {
    const { error } = await sb.from('dividends_pending').insert(novos);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, inseridos: novos.length, ignorados: itens.length - novos.length });
}
