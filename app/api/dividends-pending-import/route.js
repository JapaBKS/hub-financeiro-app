import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

// Importa a aba "a receber" da B3 -> dividends_pending.
// A B3 é a fonte da verdade do que está POR VIR: substitui todos os pendentes
// futuros (pay_date >= hoje) pelos itens colados. Pendentes já vencidos (que o
// job vai arquivar) não são tocados. Preserva duplicatas legítimas (não deduplica).
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const itens = Array.isArray(b.itens) ? b.itens : null;
  if (!itens || !itens.length) return NextResponse.json({ ok: false, erro: 'Lista vazia.' }, { status: 400 });

  const sb = supabaseServer();
  const { data: assets } = await sb.from('assets').select('id, ticker');
  const idDe = {};
  (assets || []).forEach((a) => { idDe[a.ticker] = a.id; });

  const hoje = new Date().toISOString().slice(0, 10);
  const linhas = itens
    .filter((it) => it.ticker && it.pay_date)
    .map((it) => ({
      ticker: it.ticker,
      asset_id: idDe[it.ticker] || null,
      pay_date: it.pay_date,
      kind: it.kind,
      amount: Number(it.amount),
      classe: it.classe || (/11$/.test(it.ticker) ? 'fiis' : 'acoes'),
    }));

  // apaga os futuros atuais e insere os da B3 (substituição)
  const { error: delErr } = await sb.from('dividends_pending').delete().gte('pay_date', hoje);
  if (delErr) return NextResponse.json({ ok: false, erro: delErr.message }, { status: 500 });

  if (linhas.length) {
    const { error: insErr } = await sb.from('dividends_pending').insert(linhas);
    if (insErr) return NextResponse.json({ ok: false, erro: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inseridos: linhas.length, substituido: true });
}
