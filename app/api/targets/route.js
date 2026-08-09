import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

// Recebe a lista completa de um grupo e reconcilia:
// cria/atualiza o peso (target_pct) de cada ativo e zera os que saíram.
export async function POST(req) {
  const { class_id, itens } = await req.json().catch(() => ({}));
  if (!class_id || !Array.isArray(itens)) {
    return NextResponse.json({ ok: false, erro: 'Dados inválidos.' }, { status: 400 });
  }

  const sb = supabaseServer();
  const tickers = [];

  for (const it of itens) {
    const tk = String(it.ticker || '').trim().toUpperCase();
    if (!tk) continue;
    const pct = Number(it.pct); // fração (0-1)
    const congelado = !!it.congelado;
    tickers.push(tk);
    const { data: ex } = await sb.from('assets').select('id').eq('ticker', tk).maybeSingle();
    if (ex) {
      await sb.from('assets').update({ target_pct: pct, class_id: Number(class_id), is_active: true, congelado }).eq('id', ex.id);
    } else {
      await sb.from('assets').insert({ ticker: tk, class_id: Number(class_id), target_pct: pct, is_active: true, congelado });
    }
  }

  // zera o alvo de quem era recomendado nesse grupo mas saiu da lista
  const { data: doGrupo } = await sb.from('assets').select('id, ticker').eq('class_id', class_id).not('target_pct', 'is', null);
  const remover = (doGrupo || []).filter((a) => !tickers.includes(a.ticker)).map((a) => a.id);
  if (remover.length) await sb.from('assets').update({ target_pct: null }).in('id', remover);

  return NextResponse.json({ ok: true });
}
