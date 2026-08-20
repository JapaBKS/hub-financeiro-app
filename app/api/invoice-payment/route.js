import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, id, data } from '../../../lib/api';
import { hojeISO } from '../../../lib/dominio/datas';

const dia = (v) => String(v || '').slice(0, 10);

export const POST = rota(async (b) => {
  const cartao = id(b.card_id, 'o cartão');
  const fatura = data(b.bill_month, 'O mês da fatura');
  const pagoEm = b.paid_at ? dia(b.paid_at) : hojeISO();

  const sb = supabaseServer();
  checar(await sb.from('invoice_payments').upsert(
    { card_id: cartao, bill_month: fatura, paid_at: pagoEm },
    { onConflict: 'card_id,bill_month' },
  ));
  return ok({ paid_at: pagoEm });
});

export const DELETE = rota(async (b) => {
  const cartao = id(b.card_id, 'o cartão');
  const fatura = data(b.bill_month, 'O mês da fatura');

  const sb = supabaseServer();
  checar(await sb.from('invoice_payments').delete()
    .eq('card_id', cartao)
    .eq('bill_month', fatura));
  return ok();
});
