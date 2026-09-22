import { createClient } from '@supabase/supabase-js';

// Cliente do lado do servidor (usa a service_role key, que NUNCA vai pro navegador).
// Só importado em componentes de servidor / rotas de API.
export function supabaseServer() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
} // <-- Esta chave estava faltando antes do código novo!

export function extrairDados(resposta) {
  if (resposta.error) {
    console.error('[Erro Supabase]', resposta.error);
    throw new Error('Não foi possível carregar os dados. Tente atualizar a página.');
  }
  return resposta.data;
}
