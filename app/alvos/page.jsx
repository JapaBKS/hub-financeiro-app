import { supabaseServer } from '../../lib/supabase';
import AlvosClient from './alvos-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const GRUPOS = ['Ações BR', 'BDRS', 'FIIS'];

export default async function Alvos() {
  const sb = supabaseServer();
  const { data: classes } = await sb.from('asset_classes').select('id, name, target_pct').in('name', GRUPOS);
  const ids = (classes || []).map((c) => c.id);
  const { data: assets } = await sb
    .from('assets')
    .select('ticker, target_pct, class_id')
    .in('class_id', ids)
    .not('target_pct', 'is', null);

  const grupos = (classes || [])
    .sort((a, b) => GRUPOS.indexOf(a.name) - GRUPOS.indexOf(b.name))
    .map((c) => ({
      class_id: c.id,
      name: c.name,
      groupTarget: Number(c.target_pct),
      itens: (assets || [])
        .filter((a) => a.class_id === c.id)
        .map((a) => ({ ticker: a.ticker, pct: Math.round(Number(a.target_pct) * 10000) / 100 })) // fração -> %
        .sort((a, b) => b.pct - a.pct),
    }));

  return (
    <div className="wrap" style={{ maxWidth: 600 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Carteira recomendada</b><span>pesos por ativo · dia 10</span></div>
        </div>
        <a href="/recomendacoes" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>ver sinais →</a>
      </header>
      <AlvosClient grupos={grupos} />
    </div>
  );
}
