import { createClient } from '@supabase/supabase-js';

// Cliente do lado do servidor — usa a service_role key, que NUNCA vai pro navegador.
// Só é importado em componentes de servidor / rotas de API.
export function supabaseServer() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}
