import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, numero, mes } from '../../../lib/api';

// Um registro por mês, com duas "quinzenas": 1 = dia 15 (adiantamento), 2 = dia 30 (saldo).
export const POST = rota(async (b) => {
  const ym = mes(b.mes, 'O mês');
  const reg = {
    mes: `${ym}-01`,
    recebido_1: numero(b.recebido_1 || 0, 'O recebido da 1ª quinzena', { min: 0 }),
    recebido_2: numero(b.recebido_2 || 0, 'O recebido da 2ª quinzena', { min: 0 }),
    investido_1: numero(b.investido_1 || 0, 'O investido da 1ª quinzena', { min: 0 }),
    investido_2: numero(b.investido_2 || 0, 'O investido da 2ª quinzena', { min: 0 }),
    // ajuste manual (pode ser negativo): sobra que ficou na corretora, valor que foi para reserva/fluxo…
    ajuste_1: numero(b.ajuste_1 || 0, 'O ajuste da 1ª quinzena'),
    ajuste_2: numero(b.ajuste_2 || 0, 'O ajuste da 2ª quinzena'),
  };
  const sb = supabaseServer();
  checar(await sb.from('fluxo_mensal').upsert(reg, { onConflict: 'mes' }));
  return ok();
});
