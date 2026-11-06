'use server';

import { supabaseServer } from '../../lib/supabase';
import { revalidatePath } from 'next/cache';

// quantidade/preço vazios virariam 0 e a negociação sumiria do cálculo da carteira
function validar(f) {
  const q = Number(f.quantity), p = Number(f.price);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.traded_at || '')) return 'Informe a data.';
  if (f.side !== 'compra' && f.side !== 'venda') return 'Escolha compra ou venda.';
  if (!Number.isFinite(q) || q <= 0) return 'A quantidade precisa ser maior que zero.';
  if (!Number.isFinite(p) || p <= 0) return 'O preço precisa ser maior que zero.';
  return null;
}

export async function apagarNegociacao(id) {
  const sb = supabaseServer();
  const { error } = await sb.from('trades').delete().eq('id', id);
  
  if (error) return { ok: false, erro: error.message };
  
  revalidatePath('/negociacoes');
  revalidatePath('/carteira');
  revalidatePath('/apuracao');
  
  return { ok: true };
}

export async function atualizarNegociacao(id, form) {
  const invalido = validar(form);
  if (invalido) return { ok: false, erro: invalido };
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
  const tk = (dados.ticker || '').trim().toUpperCase();
  
  if (!tk) return { ok: false, erro: 'Informe o ticker.' };
  const invalido = validar(dados);
  if (invalido) return { ok: false, erro: invalido };

  // 1. Achar ou criar o ativo (equivalente à rota original robusta)
  const { data: existente } = await sb.from('assets').select('id').eq('ticker', tk).maybeSingle();
  let assetId = existente ? existente.id : null;

  if (!assetId) {
    if (!dados.classId) {
      return { ok: false, erro: `${tk} ainda não está cadastrado: escolha a classe.` };
    }
    const { data: novo, error: errNovo } = await sb.from('assets')
      .insert({ ticker: tk, class_id: Number(dados.classId), is_active: true })
      .select('id')
      .single();
      
    if (errNovo) return { ok: false, erro: `Erro ao cadastrar ativo: ${errNovo.message}` };
    assetId = novo.id;
  }

  // 2. Inserir a negociação na tabela trades
  const { error } = await sb.from('trades').insert({
    asset_id: assetId,
    traded_at: dados.traded_at,
    side: dados.side,
    quantity: Number(dados.quantity),
    price: Number(dados.price)
  });

  if (error) return { ok: false, erro: error.message };

  // 3. Atualizar as caches das páginas afetadas
  revalidatePath('/negociacoes');
  revalidatePath('/carteira');
  revalidatePath('/apuracao');
  revalidatePath('/recomendacoes');
  
  return { ok: true };
}
