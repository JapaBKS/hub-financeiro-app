import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, ErroDeUso, id, numero, texto } from '../../../lib/api';

export const POST = rota(async (b) => {
  const nome = texto(b.label, 'o nome');
  const classe = id(b.class_id, 'a classe');
  const valor = numero(b.amount, 'O valor');

  const sb = supabaseServer();
  const criado = checar(await sb.from('manual_holdings')
    .insert({ label: nome, class_id: classe, amount: valor })
    .select('id')
    .single());
  return ok({ id: criado.id });
});

export const PATCH = rota(async (b) => {
  const registro = id(b.id);
  const patch = { updated_at: new Date().toISOString() };
  if (b.label) patch.label = texto(b.label, 'o nome');
  if (b.amount != null && b.amount !== '') patch.amount = numero(b.amount, 'O valor');
  if (Object.keys(patch).length === 1) throw new ErroDeUso('Nada para alterar.');

  const sb = supabaseServer();
  checar(await sb.from('manual_holdings').update(patch).eq('id', registro));
  return ok();
});

export const DELETE = rota(async (b) => {
  const sb = supabaseServer();
  checar(await sb.from('manual_holdings').delete().eq('id', id(b.id)));
  return ok();
});
