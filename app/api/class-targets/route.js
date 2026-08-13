import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, lista, numero, id } from '../../../lib/api';

export const POST = rota(async (b) => {
  const alvos = lista(b.targets, 'A lista de metas');
  const sb = supabaseServer();

  for (const t of alvos) {
    if (t.id == null) continue;
    const fracao = Math.max(0, numero(t.target_pct ?? 0, 'A meta'));
    const fixo = t.alvo_valor == null || t.alvo_valor === ''
      ? null
      : Math.max(0, numero(t.alvo_valor, 'O valor fixo', { min: 0 }));

    checar(await sb.from('asset_classes')
      .update({ target_pct: fracao, alvo_valor: fixo, fora_rateio: !!t.fora_rateio })
      .eq('id', id(t.id)));
  }
  return ok();
});
