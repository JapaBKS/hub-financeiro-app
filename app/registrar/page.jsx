import { supabaseServer } from '../../lib/supabase';
import FormNegociacao from './FormNegociacao';

export const dynamic = 'force-dynamic';

export default async function Registrar() {
  const sb = supabaseServer();
  const [{ data: assets }, { data: classes }] = await Promise.all([
    sb.from('assets').select('ticker').order('ticker'),
    sb.from('asset_classes').select('id, name').order('name'),
  ]);

  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Registrar negociação</b><span>compra ou venda de ativo</span></div>
        </div>
        <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
      </header>
      <FormNegociacao assets={assets || []} classes={classes || []} />
    </div>
  );
}
