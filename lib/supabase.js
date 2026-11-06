import { createClient } from '@supabase/supabase-js';

// Cliente do lado do servidor (usa a service_role key, que NUNCA vai pro navegador).
// Só importado em componentes de servidor / rotas de API.
export function supabaseServer() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

export function extrairDados(resposta) {
  if (resposta.error) {
    console.error('[Erro Supabase]', resposta.error);
    throw new Error('Não foi possível carregar os dados. Tente atualizar a página.');
  }
  return resposta.data;
}

// O Supabase devolve no máximo 1.000 linhas por consulta, sem avisar.
// Para tabelas que crescem (caixa, parcelas de cartão, negociações), lê em páginas.
// `montar(de, ate)` recebe o intervalo e devolve a consulta já com .range(de, ate).
export async function lerTudo(montar, tamanho = 1000) {
  const linhas = [];
  for (let de = 0; ; de += tamanho) {
    const { data, error } = await montar(de, de + tamanho - 1);
    if (error) return { data: null, error };
    linhas.push(...(data || []));
    if (!data || data.length < tamanho) return { data: linhas, error: null };
  }
}
