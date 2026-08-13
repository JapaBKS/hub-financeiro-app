import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, ErroDeUso, id, numero, texto, data } from '../../../lib/api';

/** O pagador é DERIVADO do percentual — guardar os dois separados abriria espaço
 *  para ficarem inconsistentes (ex.: pagador 'eu' com pai_pct 100). */
const pagadorDe = (paiPct) => (paiPct <= 0 ? 'eu' : paiPct >= 100 ? 'pai' : 'dividido');
const percentualPai = (v) => numero(v ?? 0, 'A parte do pai', { min: 0, max: 100 });

export const POST = rota(async (b) => {
  const paiPct = percentualPai(b.pai_pct);

  const sb = supabaseServer();
  checar(await sb.from('card_purchases').insert({
    card_id: id(b.card_id, 'o cartão'),
    description: texto(b.description, 'a descrição'),
    categoria: b.categoria || null,
    pagador: pagadorDe(paiPct),
    pai_pct: paiPct,
    purchased_at: data(b.purchased_at, 'A data da compra'),
    installment_amount: numero(b.installment_amount, 'O valor da parcela', { min: 0.01 }),
    installments_count: numero(b.installments_count, 'O número de parcelas', { min: 1, inteiro: true }),
    first_billed_month: data(b.first_billed_month, 'O mês da primeira parcela'),
  }));
  return ok();
});

export const PATCH = rota(async (b) => {
  const registro = id(b.id);
  const patch = {};
  if (b.card_id) patch.card_id = id(b.card_id, 'o cartão');
  if (b.description) patch.description = texto(b.description, 'a descrição');
  if (b.installment_amount != null && b.installment_amount !== '') {
    patch.installment_amount = numero(b.installment_amount, 'O valor da parcela', { min: 0 });
  }
  if (b.installments_count != null && b.installments_count !== '') {
    patch.installments_count = numero(b.installments_count, 'O número de parcelas', { min: 1, inteiro: true });
  }
  if (b.first_billed_month) patch.first_billed_month = data(b.first_billed_month, 'O mês da primeira parcela');
  if (b.categoria !== undefined) patch.categoria = b.categoria || null;
  if (b.pai_pct !== undefined && b.pai_pct !== '') {
    patch.pai_pct = percentualPai(b.pai_pct);
    patch.pagador = pagadorDe(patch.pai_pct);
  }
  if (Object.keys(patch).length === 0) throw new ErroDeUso('Nada para alterar.');

  const sb = supabaseServer();
  checar(await sb.from('card_purchases').update(patch).eq('id', registro));
  return ok();
});

export const DELETE = rota(async (b) => {
  const sb = supabaseServer();
  checar(await sb.from('card_purchases').delete().eq('id', id(b.id)));
  return ok();
});
