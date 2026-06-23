import { supabaseServer } from '../../lib/supabase';
import FormCartao from './form-client';
import Recentes from './recentes-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Cartoes() {
  const sb = supabaseServer();
  const [{ data: cards }, { data: recentes }] = await Promise.all([
    sb.from('cards').select('id, name, due_day').order('name'),
    sb.from('card_purchases')
      .select('id, description, categoria, pagador, installment_amount, installments_count, first_billed_month, card_id, cards(name)')
      .order('first_billed_month', { ascending: false })
      .order('id', { ascending: false })
      .limit(20),
  ]);

  const recentesFlat = (recentes || []).map((p) => ({
    id: p.id,
    cartao: p.cards?.name || '?',
    card_id: p.card_id,
    description: p.description,
    categoria: p.categoria,
    pagador: p.pagador,
    installment_amount: p.installment_amount,
    installments_count: p.installments_count,
    first_billed_month: p.first_billed_month,
  }));

  return (
    <div className="wrap" style={{ maxWidth: 560 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Compra no cartão</b><span>lançamento com parcelas</span></div>
        </div>
        <a href="/faturas" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>ver faturas →</a>
      </header>
      <FormCartao cards={cards || []} />
      <Recentes purchases={recentesFlat} cards={cards || []} />
    </div>
  );
}
