import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, mes } from '../../../lib/api';

// POST   { mes:'AAAA-MM', valor } -> marca a guia como paga
// DELETE { mes:'AAAA-MM' }        -> desfaz
export const POST = rota(async (b) => {
  const ym = mes(b.mes, 'O mês de apuração');
  const sb = supabaseServer();
  checar(await sb.from('darf_payments').upsert(
    {
      mes_apuracao: ym,
      paid_at: new Date().toISOString().slice(0, 10),
      valor: Number(b.valor) || null,
    },
    { onConflict: 'mes_apuracao' },
  ));
  return ok();
});

export const DELETE = rota(async (b) => {
  const ym = mes(b.mes, 'O mês de apuração');
  const sb = supabaseServer();
  checar(await sb.from('darf_payments').delete().eq('mes_apuracao', ym));
  return ok();
});
