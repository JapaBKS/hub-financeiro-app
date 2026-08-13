import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, ErroDeUso, id, numero, ticker, data } from '../../../lib/api';

const asSide = (v) => {
  if (v !== 'compra' && v !== 'venda') throw new ErroDeUso('Informe se é compra ou venda.');
  return v;
};

/** Acha o ativo pelo ticker; se não existir, cria (exige a classe). */
async function acharOuCriarAtivo(sb, tk, classId) {
  const { data: existente } = await sb.from('assets').select('id').eq('ticker', tk).maybeSingle();
  if (existente) return existente.id;
  if (!classId) throw new ErroDeUso(`${tk} ainda não está cadastrado: escolha a classe.`);
  const novo = checar(await sb.from('assets')
    .insert({ ticker: tk, class_id: id(classId, 'a classe'), is_active: true })
    .select('id')
    .single());
  return novo.id;
}

export const POST = rota(async (b) => {
  const tk = ticker(b.ticker);
  const lado = asSide(b.side);
  const quando = data(b.traded_at, 'A data da negociação');
  const quantidade = numero(b.quantity, 'A quantidade', { min: 0.00000001 });
  const preco = numero(b.price, 'O preço', { min: 0.000001 });

  const sb = supabaseServer();
  const assetId = await acharOuCriarAtivo(sb, tk, b.classId);

  checar(await sb.from('trades').insert({
    asset_id: assetId, traded_at: quando, side: lado, quantity: quantidade, price: preco,
  }));
  return ok();
});

export const PATCH = rota(async (b) => {
  const registro = id(b.id);
  const patch = {};
  if (b.traded_at) patch.traded_at = data(b.traded_at, 'A data da negociação');
  if (b.side) patch.side = asSide(b.side);
  if (b.quantity != null) patch.quantity = numero(b.quantity, 'A quantidade', { min: 0.00000001 });
  if (b.price != null) patch.price = numero(b.price, 'O preço', { min: 0.000001 });
  if (Object.keys(patch).length === 0) throw new ErroDeUso('Nada para alterar.');

  const sb = supabaseServer();
  checar(await sb.from('trades').update(patch).eq('id', registro));
  return ok();
});

export const DELETE = rota(async (b) => {
  const sb = supabaseServer();
  checar(await sb.from('trades').delete().eq('id', id(b.id)));
  return ok();
});
