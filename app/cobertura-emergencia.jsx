import { supabaseServer } from '../lib/supabase';
import CofresClient from './cofres-client';

// Faixa compacta com as classes que têm alvo em R$ (Emergência, Fluxo...).
// Mostra o saldo, o % em relação ao alvo e permite editar o alvo ali mesmo.
export default async function CoberturaEmergencia() {
  const sb = supabaseServer();
  const [{ data: alloc }, { data: classes }] = await Promise.all([
    sb.from('v_class_allocation').select('classe, valor'),
    sb.from('asset_classes').select('id, name, alvo_valor'),
  ]);

  const valorDe = {};
  (alloc || []).forEach((a) => { valorDe[a.classe] = Number(a.valor || 0); });

  const cofres = (classes || [])
    .filter((c) => c.alvo_valor != null && Number(c.alvo_valor) > 0)
    .map((c) => ({ id: c.id, nome: c.name, alvo: Number(c.alvo_valor), valor: valorDe[c.name] || 0 }))
    .sort((a, b) => b.alvo - a.alvo);

  if (!cofres.length) return null;

  return <CofresClient cofres={cofres} />;
}
