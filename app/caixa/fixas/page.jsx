import { supabaseServer } from '../../../lib/supabase';
import FixasClient from './fixas-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Fixas() {
  const sb = supabaseServer();
  const [{ data: bills }, { data: cats }] = await Promise.all([
    sb.from('recurring_bills').select('*').order('name'),
    sb.from('cashbook').select('category'),
  ]);
  const categorias = [...new Set((cats || []).map((c) => c.category).filter(Boolean))].sort();

  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Contas fixas</b><span>recorrentes do caixa</span></div>
        </div>
        <a href="/caixa" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← caixa</a>
      </header>
      <FixasClient bills={bills || []} categorias={categorias} />
    </div>
  );
}
