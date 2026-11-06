import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, ErroDeUso } from '../../../lib/api';
import { inicioDoMes } from '../../../lib/dominio/datas';

export const POST = rota(async () => {
  const sb = supabaseServer();
  const mesAtual = inicioDoMes(); // mês de Brasília (às 22h do dia 31 ainda é o mês corrente)

  const [alloc, classes] = await Promise.all([
    sb.from('v_class_allocation').select('classe, valor'),
    sb.from('asset_classes').select('id, name'),
  ]);
  const idDe = {};
  (checar(classes) || []).forEach((c) => { idDe[c.name] = c.id; });

  const linhas = (checar(alloc) || [])
    .map((a) => ({ snapshot_month: mesAtual, class_id: idDe[a.classe], value: Number(a.valor) }))
    .filter((r) => r.class_id != null);

  if (!linhas.length) throw new ErroDeUso('Nada para salvar.');

  checar(await sb.from('portfolio_snapshots')
    .upsert(linhas, { onConflict: 'snapshot_month,class_id' }));

  return ok({ mes: mesAtual, total: linhas.reduce((s, r) => s + r.value, 0) });
});
