import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, ticker, data, numero, id, texto } from '../../../lib/api';

// POST   { ticker, event_date, tipo, fator, nota }
// DELETE { id }
export const POST = rota(async (b) => {
  const tk = ticker(b.ticker);
  const quando = data(b.event_date, 'A data do evento');
  // fator multiplica a quantidade: 1:2 -> 2 | 2:1 -> 0,5 | bonificação 10% -> 1,1
  const fator = numero(b.fator, 'O fator', { min: 0.000001 });

  const sb = supabaseServer();
  checar(await sb.from('corporate_events').insert({
    ticker: tk,
    event_date: quando,
    fator,
    tipo: texto(b.tipo, 'o tipo', { obrigatorio: false }) || 'desdobramento',
    nota: texto(b.nota, 'a nota', { obrigatorio: false }) || null,
  }));
  return ok();
});

export const DELETE = rota(async (b) => {
  const sb = supabaseServer();
  checar(await sb.from('corporate_events').delete().eq('id', id(b.id)));
  return ok();
});
