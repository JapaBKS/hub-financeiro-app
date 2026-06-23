-- Permite dividir uma compra entre você e o pai (percentual que o pai paga).

alter table card_purchases add column if not exists pai_pct numeric not null default 0;

-- migra o que já existe: quem estava marcado como 'pai' vira 100%
update card_purchases set pai_pct = 100 where pagador = 'pai';

drop view if exists v_card_invoice;
drop view if exists v_card_invoice_items;

create view v_card_invoice_items as
select
  p.id                                                          as purchase_id,
  p.card_id,
  (p.first_billed_month + (gs.n || ' months')::interval)::date  as bill_month,
  p.description,
  p.categoria,
  p.pagador,
  coalesce(p.pai_pct, 0)                                        as pai_pct,
  (gs.n + 1) || '/' || p.installments_count                     as parcela,
  p.installment_amount                                          as amount,
  round(p.installment_amount * coalesce(p.pai_pct, 0) / 100, 2) as amount_pai,
  p.installment_amount
    - round(p.installment_amount * coalesce(p.pai_pct, 0) / 100, 2) as amount_eu
from card_purchases p
cross join lateral generate_series(0, p.installments_count - 1) as gs(n);

create view v_card_invoice as
select
  c.id   as card_id,
  c.name as cartao,
  c.due_day,
  i.bill_month,
  sum(i.amount)     as total,
  sum(i.amount_pai) as total_pai,
  sum(i.amount_eu)  as total_eu
from v_card_invoice_items i
join cards c on c.id = i.card_id
group by c.id, c.name, c.due_day, i.bill_month;
