import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

// POST   { name }            -> cria uma classe (aba) nova
// PATCH  { id, name }        -> renomeia
// DELETE { id }              -> exclui (só se não tiver nenhum ativo dentro)

export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim();
  if (!name) return NextResponse.json({ ok: false, erro: 'Informe o nome da aba.' }, { status: 400 });

  const sb = supabaseServer();
  const { data: ja } = await sb.from('asset_classes').select('id').ilike('name', name).maybeSingle();
  if (ja) return NextResponse.json({ ok: false, erro: `Já existe uma classe "${name}".` }, { status: 400 });

  const { error } = await sb.from('asset_classes').insert({ name, target_pct: 0 });
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req) {
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  if (!id) return NextResponse.json({ ok: false, erro: 'Id ausente.' }, { status: 400 });

  const sb = supabaseServer();
  const patch = {};

  if (b.name !== undefined) {
    const name = String(b.name || '').trim();
    if (!name) return NextResponse.json({ ok: false, erro: 'Nome não pode ficar vazio.' }, { status: 400 });
    const { data: ja } = await sb.from('asset_classes').select('id').ilike('name', name).maybeSingle();
    if (ja && Number(ja.id) !== id) {
      return NextResponse.json({ ok: false, erro: `Já existe uma classe "${name}".` }, { status: 400 });
    }
    patch.name = name;
  }

  // alvo em R$ (cofres). null/'' limpa o alvo.
  if (b.alvo_valor !== undefined) {
    const v = b.alvo_valor === null || b.alvo_valor === '' ? null : Number(b.alvo_valor);
    if (v !== null && !(v >= 0)) {
      return NextResponse.json({ ok: false, erro: 'Valor inválido.' }, { status: 400 });
    }
    patch.alvo_valor = v;
  }

  if (!Object.keys(patch).length) {
    return NextResponse.json({ ok: false, erro: 'Nada para alterar.' }, { status: 400 });
  }

  const { error } = await sb.from('asset_classes').update(patch).eq('id', id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id);
  if (!id) return NextResponse.json({ ok: false, erro: 'Id ausente.' }, { status: 400 });

  const sb = supabaseServer();

  const { count: nAtivos } = await sb.from('assets').select('id', { count: 'exact', head: true }).eq('class_id', id);
  if (nAtivos && nAtivos > 0) {
    return NextResponse.json(
      { ok: false, erro: `Essa aba ainda tem ${nAtivos} ativo(s). Mova ou remova antes de excluir.` },
      { status: 400 },
    );
  }

  // snapshots do histórico apontam pra classe — apagar quebraria a evolução do patrimônio
  const { count: nSnaps } = await sb.from('portfolio_snapshots').select('id', { count: 'exact', head: true }).eq('class_id', id);
  if (nSnaps && nSnaps > 0) {
    return NextResponse.json(
      {
        ok: false,
        erro: `Essa classe tem ${nSnaps} registro(s) no histórico de patrimônio. Excluir apagaria parte da sua evolução. Renomeie a classe ou deixe a meta em 0% em vez de excluir.`,
      },
      { status: 400 },
    );
  }

  const { error } = await sb.from('asset_classes').delete().eq('id', id);
  if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
