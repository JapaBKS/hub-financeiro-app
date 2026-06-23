import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST() {
  const sb = supabaseServer();
  const hoje = new Date();
  const mesAtual = `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, '0')}-01`;

  const [{ data: alloc }, { data: classes }] = await Promise.all([
    sb.from('v_class_allocation').select('classe, valor'),
    sb.from('asset_classes').select('id, name'),
  ]);
  const idDe = {};
  (classes || []).forEach((c) => { idDe[c.name] = c.id; });

  const linhas = (alloc || [])
    .map((a) => ({ snapshot_month: mesAtual, class_id: idDe[a.classe], value: Number(a.valor) }))
    .filter((r) => r.class_id != null);

  if (!linhas.length) return NextResponse.json({ ok: false, erro: 'Nada para salvar.' }, { status: 400 });

  const { error } = await sb.from('portfolio_snapshots').upsert(linhas, { onConflict: 'snapshot_month,class_id' });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });

  const total = linhas.reduce((s, r) => s + r.value, 0);
  return NextResponse.json({ ok: true, mes: mesAtual, total });
}
