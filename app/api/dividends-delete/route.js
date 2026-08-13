import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, ErroDeUso, id, mes } from '../../../lib/api';

/** Primeiro dia do mês seguinte — evita datas inválidas como "31 de setembro". */
function inicioDoProximoMes(ym) {
  const [ano, m] = ym.split('-').map(Number);
  return m === 12 ? `${ano + 1}-01-01` : `${ano}-${String(m + 1).padStart(2, '0')}-01`;
}

// POST { id }              -> exclui um provento
// POST { month:'AAAA-MM' } -> limpa o mês inteiro (para reimportar da B3)
export const POST = rota(async (b) => {
  const sb = supabaseServer();

  if (b.id != null) {
    checar(await sb.from('dividends').delete().eq('id', id(b.id)));
    return ok();
  }

  if (b.month != null) {
    const ym = mes(b.month, 'O mês');
    checar(await sb.from('dividends').delete()
      .gte('paid_at', `${ym}-01`)
      .lt('paid_at', inicioDoProximoMes(ym)));
    return ok();
  }

  throw new ErroDeUso('Informe id ou month.');
});
