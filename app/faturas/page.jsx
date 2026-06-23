import { supabaseServer } from '../../lib/supabase';
import FaturasView from './view-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Faturas() {
  const sb = supabaseServer();
  const [{ data: cards }, { data: invoices }, { data: items }] = await Promise.all([
    sb.from('cards').select('id, name, due_day').order('name'),
    sb.from('v_card_invoice').select('*'),
    sb.from('v_card_invoice_items').select('card_id, bill_month, description, categoria, pagador, pai_pct, parcela, amount, amount_pai'),
  ]);

  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Faturas</b><span>por cartão e mês</span></div>
        </div>
        <a href="/cartoes" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>+ nova compra</a>
      </header>
      <FaturasView cards={cards || []} invoices={invoices || []} items={items || []} />
    </div>
  );
}
