import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, ErroDeUso, texto, numero, id } from '../../../lib/api';

const diaVencimento = (v) => numero(v, 'O dia de vencimento', { min: 1, max: 31, inteiro: true });

async function nomeLivre(sb, nome, exceto = null) {
  const { data } = await sb.from('cards').select('id').ilike('name', nome).maybeSingle();
  if (data && Number(data.id) !== exceto) throw new ErroDeUso(`Já existe um cartão "${nome}".`);
}

export const POST = rota(async (b) => {
  const nome = texto(b.name, 'o nome do cartão');
  const dia = diaVencimento(b.due_day);

  const sb = supabaseServer();
  await nomeLivre(sb, nome);
  checar(await sb.from('cards').insert({ name: nome, due_day: dia, ativo: true }));
  return ok();
});

export const PATCH = rota(async (b) => {
  const cartaoId = id(b.id);
  const sb = supabaseServer();
  const patch = {};

  if (b.name !== undefined) {
    patch.name = texto(b.name, 'o nome do cartão');
    await nomeLivre(sb, patch.name, cartaoId);
  }
  if (b.due_day !== undefined) patch.due_day = diaVencimento(b.due_day);
  if (b.ativo !== undefined) patch.ativo = !!b.ativo;
  if (Object.keys(patch).length === 0) throw new ErroDeUso('Nada para alterar.');

  checar(await sb.from('cards').update(patch).eq('id', cartaoId));
  return ok();
});

// Cartão com histórico não é apagado: quebraria as faturas antigas.
const VINCULOS = [
  ['card_purchases', 'compras lançadas'],
  ['invoice_payments', 'pagamentos de fatura'],
  ['recurring_bills', 'contas fixas'],
  ['cashbook', 'lançamentos no caixa'],
];

export const DELETE = rota(async (b) => {
  const cartaoId = id(b.id);
  const sb = supabaseServer();

  for (const [tabela, rotulo] of VINCULOS) {
    const { count, error } = await sb.from(tabela)
      .select('id', { count: 'exact', head: true })
      .eq('card_id', cartaoId);
    if (error) continue; // tabela pode não ter card_id
    if (count) {
      throw new ErroDeUso(
        `Esse cartão tem ${count} ${rotulo}. Em vez de excluir, desative — o histórico é preservado.`,
      );
    }
  }

  checar(await sb.from('cards').delete().eq('id', cartaoId));
  return ok();
});
