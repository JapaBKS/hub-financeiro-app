import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const itens = Array.isArray(b.itens) ? b.itens : null;
  if (!itens || !itens.length) return NextResponse.json({ ok: false, erro: 'Nada para importar.' }, { status: 400 });

  const sb = supabaseServer();
  // dedup contra o que já existe (data+detalhe+valor+tipo)
  const { data: existentes } = await sb.from('cashbook').select('entry_date, details, amount, kind');
  const chave = (d, det, a, k) => `${(d || '').slice(0, 10)}|${(det || '').trim().toLowerCase()}|${Number(a).toFixed(2)}|${k}`;
  const jaTem = new Set((existentes || []).map((e) => chave(e.entry_date, e.details, e.amount, e.kind)));

  const novos = [];
  const vistos = new Set();
  for (const it of itens) {
    if (!it.entry_date || !it.amount) continue;
    const k = chave(it.entry_date, it.details, it.amount, it.kind);
    if (jaTem.has(k) || vistos.has(k)) continue;
    vistos.add(k);
    novos.push({
      entry_date: it.entry_date,
      details: (it.details || '').trim(),
      category: (it.category || 'Outros').trim() || 'Outros',
      amount: Math.abs(Number(it.amount) || 0),
      kind: it.kind === 'entrada' ? 'entrada' : 'saida',
      paid: it.paid !== false,
    });
  }

  if (novos.length) {
    const { error } = await sb.from('cashbook').insert(novos);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, inseridos: novos.length, ignorados: itens.length - novos.length });
}
