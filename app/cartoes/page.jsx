import { supabaseServer } from '../../lib/supabase';
import CartoesTabs from './tabs-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Cartoes() {
  const sb = supabaseServer();
  const [{ data: cards }, { data: recentes }, { data: invoices }, { data: items }, { data: payments }] = await Promise.all([
    sb.from('cards').select('id, name, due_day, ativo').order('name'),
    sb.from('card_purchases')
      .select('id, description, categoria, pagador, pai_pct, purchased_at, installment_amount, installments_count, first_billed_month, card_id, cards(name)')
      .order('first_billed_month', { ascending: false })
      .order('id', { ascending: false }),
    sb.from('v_card_invoice').select('*'),
    sb.from('v_card_invoice_items').select('purchase_id, parcela_idx, card_id, bill_month, description, categoria, pagador, pai_pct, purchased_at, parcela, amount, amount_pai'),
    sb.from('invoice_payments').select('card_id, bill_month, paid_at'),
  ]);

  const recentesFlat = (recentes || []).map((p) => ({
    id: p.id,
    cartao: p.cards?.name || '?',
    card_id: p.card_id,
    description: p.description,
    categoria: p.categoria,
    pagador: p.pagador,
    pai_pct: p.pai_pct,
    purchased_at: p.purchased_at,
    installment_amount: p.installment_amount,
    installments_count: p.installments_count,
    first_billed_month: p.first_billed_month,
  }));

  return (
    <div className="wrap">
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Cartões</b><span>faturas e lançamentos</span></div>
        </div>
        <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
      </header>
      <CartoesTabs
        cards={cards || []}
        recentes={recentesFlat}
        invoices={invoices || []}
        items={items || []}
        payments={payments || []}
      />
    </div>
  );
}
