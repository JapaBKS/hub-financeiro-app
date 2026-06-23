import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const sb = supabaseServer();

  const patch = { id: 1 };
  if (b.target_value !== undefined) patch.target_value = Number(b.target_value);
  if (b.monthly_contribution !== undefined) patch.monthly_contribution = Number(b.monthly_contribution);
  if (b.assumed_annual_return !== undefined) patch.assumed_annual_return = Number(b.assumed_annual_return);
  if (b.started_at) patch.started_at = b.started_at;
  if (b.starting_value !== undefined) patch.starting_value = Number(b.starting_value);

  const { error } = await sb.from('goal_config').upsert(patch, { onConflict: 'id' });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
