import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, id, numero } from '../../../lib/api';

export const POST = rota(async (b) => {
  const compra = id(b.purchase_id, 'a compra');
  const parcela = numero(b.n, 'A parcela', { min: 1, inteiro: true });
  const valor = numero(b.amount, 'O valor', { min: 0 });

  const sb = supabaseServer();
  checar(await sb.from('installment_overrides').upsert(
    { purchase_id: compra, n: parcela, amount: valor },
    { onConflict: 'purchase_id,n' },
  ));
  return ok();
});

// remove o ajuste, voltando ao valor padrão da parcela
export const DELETE = rota(async (b) => {
  const compra = id(b.purchase_id, 'a compra');
  const parcela = numero(b.n, 'A parcela', { min: 1, inteiro: true });

  const sb = supabaseServer();
  checar(await sb.from('installment_overrides').delete()
    .eq('purchase_id', compra)
    .eq('n', parcela));
  return ok();
});
