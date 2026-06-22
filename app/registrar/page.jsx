import { supabaseServer } from '../../lib/supabase';
import FormNegociacao from './form-client';
import Recentes from './recentes-client';

export const dynamic = 'force-dynamic';

export default async function Registrar() {
  const sb = supabaseServer();
  const [{ data: assets }, { data: classes }, { data: recentes }] = await Promise.all([
    sb.from('assets').select('ticker').order('ticker'),
    sb.from('asset_classes').select('id, name').order('name'),
    sb.from('trades')
      .select('id, traded_at, side, quantity, price, assets(ticker)')
      .order('traded_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(20),
  ]);

  const recentesFlat = (recentes || []).map((t) => ({
    id: t.id,
    ticker: t.assets?.ticker || '?',
    traded_at: t.traded_at,
    side: t.side,
    quantity: t.quantity,
    price: t.price,
  }));

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
      <Recentes trades={recentesFlat} />
    </div>
  );
}
