import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

const validaDia = (d) => Number.isInteger(Number(d)) && Number(d) >= 1 && Number(d) <= 31;

// POST   { name, due_day }              -> cria
// PATCH  { id, name?, due_day?, ativo? } -> edita
// DELETE { id }                          -> exclui (só se não tiver histórico)

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  if (!name) return NextResponse.json({ ok: false, erro: 'Informe o nome do cartão.' }, { status: 400 });
  if (!validaDia(b.due_day)) return NextResponse.json({ ok: false, erro: 'Dia de vencimento deve ser entre 1 e 31.' }, { status: 400 });

  const sb = supabaseServer();
  const { data: ja } = await sb.from('cards').select('id').ilike('name', name).maybeSingle();
  if (ja) return NextResponse.json({ ok: false, erro: `Já existe um cartão "${name}".` }, { status: 400 });

  const { error } = await sb.from('cards').insert({ name, due_day: Number(b.due_day), ativo: true });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req) {
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  if (!id) return NextResponse.json({ ok: false, erro: 'Id ausente.' }, { status: 400 });

  const patch = {};
  if (b.name !== undefined) {
    const name = String(b.name || '').trim();
    if (!name) return NextResponse.json({ ok: false, erro: 'Nome não pode ficar vazio.' }, { status: 400 });
    patch.name = name;
  }
  if (b.due_day !== undefined) {
    if (!validaDia(b.due_day)) return NextResponse.json({ ok: false, erro: 'Dia de vencimento deve ser entre 1 e 31.' }, { status: 400 });
    patch.due_day = Number(b.due_day);
  }
  if (b.ativo !== undefined) patch.ativo = !!b.ativo;
  if (!Object.keys(patch).length) return NextResponse.json({ ok: false, erro: 'Nada para alterar.' }, { status: 400 });

  const sb = supabaseServer();
  if (patch.name) {
    const { data: ja } = await sb.from('cards').select('id').ilike('name', patch.name).maybeSingle();
    if (ja && Number(ja.id) !== id) {
      return NextResponse.json({ ok: false, erro: `Já existe um cartão "${patch.name}".` }, { status: 400 });
    }
  }
  const { error } = await sb.from('cards').update(patch).eq('id', id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  if (!id) return NextResponse.json({ ok: false, erro: 'Id ausente.' }, { status: 400 });

  const sb = supabaseServer();
  const checar = [
    ['card_purchases', 'compras lançadas'],
    ['invoice_payments', 'pagamentos de fatura'],
    ['recurring_bills', 'contas fixas'],
    ['cashbook', 'lançamentos no caixa'],
  ];
  for (const [tabela, rotulo] of checar) {
    const { count, error } = await sb.from(tabela).select('id', { count: 'exact', head: true }).eq('card_id', id);
    if (error) continue; // tabela pode não ter card_id
    if (count && count > 0) {
      return NextResponse.json({
        ok: false,
        erro: `Esse cartão tem ${count} ${rotulo}. Em vez de excluir, desative — o histórico é preservado.`,
      }, { status: 400 });
    }
  }

  const { error } = await sb.from('cards').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
