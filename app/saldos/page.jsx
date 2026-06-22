import { supabaseServer } from '../../lib/supabase';
import SaldosClient from './saldos-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Saldos() {
  const sb = supabaseServer();
  const [{ data: holdings }, { data: classes }] = await Promise.all([
    sb.from('manual_holdings').select('id, label, amount, class_id, asset_classes(name)').order('id'),
    sb.from('asset_classes').select('id, name').order('name'),
  ]);

  const flat = (holdings || []).map((h) => ({
    id: h.id, label: h.label, amount: h.amount, class_id: h.class_id, classe: h.asset_classes?.name,
  }));

  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Saldos manuais</b><span>Tesouro, fundos, reserva, Mercado Pago…</span></div>
        </div>
        <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
      </header>
      <SaldosClient holdings={flat} classes={classes || []} />
    </div>
  );
}
