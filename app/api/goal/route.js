import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, numero, data } from '../../../lib/api';

export const POST = rota(async (b) => {
  const patch = { id: 1 };
  if (b.target_value !== undefined) patch.target_value = numero(b.target_value, 'A meta', { min: 0 });
  if (b.monthly_contribution !== undefined) patch.monthly_contribution = numero(b.monthly_contribution, 'O aporte mensal', { min: 0 });
  if (b.assumed_annual_return !== undefined) patch.assumed_annual_return = numero(b.assumed_annual_return, 'O retorno anual');
  if (b.started_at) patch.started_at = data(b.started_at, 'A data de início');
  if (b.starting_value !== undefined) patch.starting_value = numero(b.starting_value, 'O valor inicial', { min: 0 });

  const sb = supabaseServer();
  checar(await sb.from('goal_config').upsert(patch, { onConflict: 'id' }));
  return ok();
});
