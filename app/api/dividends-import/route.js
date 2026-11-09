import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

const mesSeguinte = (ym) => { const [a, m] = ym.split('-').map(Number); return m === 12 ? `${a + 1}-01-01` : `${a}-${String(m + 1).padStart(2, '0')}-01`; };
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
  const { data: existentes, error: erroExist } = await sb.from('dividends').select('ticker, paid_at, kind').in('paid_at', datas);
  // sem saber o que já existe, importar duplicaria tudo
  if (erroExist) return NextResponse.json({ ok: false, erro: 'Não foi possível conferir duplicados. Tente de novo.' }, { status: 500 });
  const jaTem = new Set((existentes || []).map((d) => chave(d.ticker, d.paid_at, d.kind)));

  // provento "a receber" importado do celular entra com o dia estimado; quando o recebido
  // real chega com outra data no mesmo mês e mesmo valor, corrige a data em vez de duplicar
  const meses = itens.map((i) => (i.paid_at || '').slice(0, 7)).filter(Boolean).sort();
  const { data: doMes } = meses.length ? await sb.from('dividends').select('id, ticker, paid_at, kind, amount')
    .in('ticker', [...new Set(itens.map((i) => i.ticker).filter(Boolean))])
    .gte('paid_at', `${meses[0]}-01`).lt('paid_at', mesSeguinte(meses[meses.length - 1])) : { data: [] };
  const usados = new Set();
  const corrigir = [];

  const novos = [];
  const vistos = new Set(); // dedup exato dentro da própria importação
  for (const it of itens) {
    if (!it.ticker || !it.paid_at) continue;
    const kDB = chave(it.ticker, it.paid_at, it.kind);
    const kExato = kDB + '|' + Number(it.amount);
    if (jaTem.has(kDB) || vistos.has(kExato)) continue;
    vistos.add(kExato);
    const estimado = (doMes || []).find((d) => !usados.has(d.id) && d.ticker === it.ticker && d.kind === it.kind
      && String(d.paid_at).slice(0, 7) === it.paid_at.slice(0, 7) && Math.abs(Number(d.amount) - Number(it.amount)) < 0.01);
    if (estimado) { usados.add(estimado.id); corrigir.push({ id: estimado.id, paid_at: it.paid_at }); continue; }
    novos.push({ ticker: it.ticker, asset_id: idDe[it.ticker] || null, paid_at: it.paid_at, kind: it.kind, amount: Number(it.amount) });
  }

  if (novos.length) {
    const { error } = await sb.from('dividends').insert(novos);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }
  for (const c of corrigir) await sb.from('dividends').update({ paid_at: c.paid_at }).eq('id', c.id);
  return NextResponse.json({ ok: true, inseridos: novos.length, ignorados: itens.length - novos.length });
}
