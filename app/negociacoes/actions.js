'use server';

import { supabaseServer } from '../../lib/supabase';
import { revalidatePath } from 'next/cache';

export async function apagarNegociacao(id) {
  const sb = supabaseServer();
  const { error } = await sb.from('trades').delete().eq('id', id);
  
  if (error) return { ok: false, erro: error.message };
  
  // Avisa o Next.js para atualizar os dados destas páginas em cache
  revalidatePath('/negociacoes');
  revalidatePath('/carteira');
  revalidatePath('/apuracao');
  
  return { ok: true };
}

export async function atualizarNegociacao(id, form) {
  const sb = supabaseServer();
  const { error } = await sb.from('trades').update({
    traded_at: form.traded_at,
    side: form.side,
    quantity: Number(form.quantity),
    price: Number(form.price)
  }).eq('id', id);

  if (error) return { ok: false, erro: error.message };
  
  revalidatePath('/negociacoes');
  revalidatePath('/carteira');
  revalidatePath('/apuracao');
  
  return { ok: true };
}
