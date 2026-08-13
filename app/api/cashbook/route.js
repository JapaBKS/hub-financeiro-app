import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, ErroDeUso, id, numero, texto, data } from '../../../lib/api';

const asKind = (v) => (v === 'entrada' ? 'entrada' : 'saida');

export const POST = rota(async (b) => {
  const linha = {
    entry_date: data(b.entry_date, 'A data'),
    details: texto(b.details, 'a descrição', { obrigatorio: false }),
    category: texto(b.category, 'a categoria', { obrigatorio: false }) || 'Outros',
    amount: Math.abs(numero(b.amount, 'O valor', { min: 0.000001 })),
    kind: asKind(b.kind),
    paid: b.paid !== false,
  };

  const sb = supabaseServer();
  checar(await sb.from('cashbook').insert(linha));
  return ok();
});

export const PATCH = rota(async (b) => {
  const registro = id(b.id);
  const patch = {};
  if (b.entry_date != null) patch.entry_date = data(b.entry_date, 'A data');
  if (b.details != null) patch.details = texto(b.details, 'a descrição', { obrigatorio: false });
  if (b.category != null) patch.category = texto(b.category, 'a categoria', { obrigatorio: false }) || 'Outros';
  if (b.amount != null) patch.amount = Math.abs(numero(b.amount, 'O valor', { min: 0 }));
  if (b.kind != null) patch.kind = asKind(b.kind);
  if (b.paid != null) patch.paid = !!b.paid;
  if (b.needs_review != null) patch.needs_review = !!b.needs_review;
  if (Object.keys(patch).length === 0) throw new ErroDeUso('Nada para alterar.');

  const sb = supabaseServer();
  checar(await sb.from('cashbook').update(patch).eq('id', registro));
  return ok();
});

export const DELETE = rota(async (b) => {
  const sb = supabaseServer();
  checar(await sb.from('cashbook').delete().eq('id', id(b.id)));
  return ok();
});
