import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const itens = Array.isArray(b.itens) ? b.itens : null;
  if (!itens || itens.length === 0) {
    return NextResponse.json({ ok: false, erro: 'Lista vazia.' }, { status: 400 });
  }

  const sb = supabaseServer();
  const hoje = new Date().toISOString().slice(0, 10);

  const { data: assets } = await sb.from('assets').select('id, ticker');
  const mapa = {};
  (assets || []).forEach((a) => { mapa[a.ticker] = a.id; });

  const norm = (d) => (d || '').slice(0, 10);
  const chave = (ticker, payDate, kind) => `${ticker}|${norm(payDate)}|${kind}`;

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
  const novasChaves = new Set(linhas.map((l) => chave(l.ticker, l.pay_date, l.kind)));

  // arquiva os pagos: passaram da data E sumiram da nova lista
  const { data: antigos } = await sb
    .from('dividends_pending')
    .select('ticker, asset_id, pay_date, kind, amount');

  const pagos = (antigos || []).filter(
    (a) => norm(a.pay_date) < hoje && !novasChaves.has(chave(a.ticker, a.pay_date, a.kind))
  );

  let arquivados = 0;
  if (pagos.length) {
    const datas = [...new Set(pagos.map((p) => norm(p.pay_date)))];
    const { data: jaPagos } = await sb
      .from('dividends')
      .select('ticker, paid_at, kind, amount')
      .in('paid_at', datas);
    const existentes = new Set((jaPagos || []).map((d) => chave(d.ticker, d.paid_at, d.kind) + '|' + Number(d.amount)));

    const inserir = pagos
      .filter((p) => !existentes.has(chave(p.ticker, p.pay_date, p.kind) + '|' + Number(p.amount)))
      .map((p) => ({
        ticker: p.ticker,
        asset_id: p.asset_id,
        paid_at: p.pay_date,
        kind: p.kind,
        amount: p.amount,
      }));

    if (inserir.length) {
      const { error: arqErr } = await sb.from('dividends').insert(inserir);
      if (arqErr) return NextResponse.json({ ok: false, erro: arqErr.message }, { status: 500 });
      arquivados = inserir.length;
    }
  }

  const { error: delErr } = await sb.from('dividends_pending').delete().neq('id', 0);
  if (delErr) return NextResponse.json({ ok: false, erro: delErr.message }, { status: 500 });

  const { error: insErr } = await sb.from('dividends_pending').insert(linhas);
  if (insErr) return NextResponse.json({ ok: false, erro: insErr.message }, { status: 500 });

  const total = linhas.reduce((s, l) => s + Number(l.amount), 0);
  return NextResponse.json({ ok: true, quantidade: linhas.length, total, arquivados });
}
