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

export async function criarNegociacao(dados) {
  const sb = supabaseServer();
  let assetId = null;

  // Lógica para encontrar ou criar a ação/fundo caso seja um ticker novo
  if (dados.ehNovo) {
    const { data: existente } = await sb.from('assets').select('id').eq('ticker', dados.ticker).maybeSingle();
    if (existente) {
      assetId = existente.id;
    } else {
      const { data: novo, error: errNovo } = await sb.from('assets')
        .insert({ ticker: dados.ticker, class_id: Number(dados.classId), is_active: true })
        .select('id')
        .single();
      if (errNovo) return { ok: false, erro: 'Falha ao criar ativo.' };
      assetId = novo.id;
    }
  } else {
    const { data: existente } = await sb.from('assets').select('id').eq('ticker', dados.ticker).maybeSingle();
    if (!existente) return { ok: false, erro: 'Ativo não encontrado.' };
    assetId = existente.id;
  }

  // Inserir a negociação
  const { error } = await sb.from('trades').insert({
    asset_id: assetId,
    traded_at: dados.traded_at,
    side: dados.side,
    quantity: Number(dados.quantity),
    price: Number(dados.price)
  });

  if (error) return { ok: false, erro: error.message };

  // Atualiza as caches
  revalidatePath('/negociacoes');
  revalidatePath('/carteira');
  revalidatePath('/apuracao');
  
  return { ok: true };
}
