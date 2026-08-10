import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const targets = Array.isArray(b.targets) ? b.targets : null;
  if (!targets) return NextResponse.json({ ok: false, erro: 'Lista inválida.' }, { status: 400 });

  const sb = supabaseServer();
  for (const t of targets) {
    if (t.id == null) continue;
    const frac = Math.max(0, Number(t.target_pct) || 0);
    const fixo = t.alvo_valor == null || t.alvo_valor === '' ? null : Math.max(0, Number(t.alvo_valor) || 0);
    const { error } = await sb.from('asset_classes')
      .update({ target_pct: frac, alvo_valor: fixo, fora_rateio: !!t.fora_rateio })
      .eq('id', Number(t.id));
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
