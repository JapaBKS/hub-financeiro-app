import { supabaseServer } from '../../lib/supabase';
import ListaNegociacoes from './lista-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Negociacoes() {
  const sb = supabaseServer();
  const { data: trades } = await sb
    .from('trades')
    .select('id, traded_at, side, quantity, price, assets(ticker)')
    .order('traded_at', { ascending: false })
    .order('id', { ascending: false });

  const flat = (trades || []).map((t) => ({
    id: t.id,
    ticker: t.assets?.ticker || '?',
    traded_at: t.traded_at,
    side: t.side,
    quantity: t.quantity,
    price: t.price,
  }));

  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Negociações</b><span>{flat.length} no total</span></div>
        </div>
        <a href="/registrar" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>+ nova</a>
      </header>
      <ListaNegociacoes trades={flat} />
    </div>
  );
}
