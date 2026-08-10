import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';

const chave = (assetId, data, side, qtd, preco) =>
  `${assetId}|${data}|${side}|${Number(qtd)}|${Number(preco).toFixed(6)}`;

// Importa negociações do extrato da B3 -> trades.
// Não duplica: ignora o que já existe (mesmo ativo, data, lado, qtd e preço).
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const itens = Array.isArray(b.itens) ? b.itens : null;
  if (!itens || !itens.length) {
    return NextResponse.json({ ok: false, erro: 'Lista vazia.' }, { status: 400 });
  }

  const sb = supabaseServer();
  const { data: assets } = await sb.from('assets').select('id, ticker');
  const idDe = {};
  (assets || []).forEach((a) => { idDe[a.ticker] = a.id; });

  const desconhecidos = [...new Set(itens.map((i) => i.ticker).filter((t) => !idDe[t]))];
  const validos = itens.filter((i) => idDe[i.ticker]);

  if (!validos.length) {
    return NextResponse.json({
      ok: false,
      erro: `Nenhum ticker cadastrado. Cadastre primeiro em Alvos: ${desconhecidos.join(', ')}`,
      desconhecidos,
    }, { status: 400 });
  }

  // busca as trades já existentes nas datas envolvidas, pra não duplicar
  const datas = [...new Set(validos.map((i) => i.traded_at))];
  const { data: existentes } = await sb
    .from('trades')
    .select('asset_id, traded_at, side, quantity, price')
    .in('traded_at', datas);

  const jaTem = new Set(
    (existentes || []).map((t) =>
      chave(t.asset_id, (t.traded_at || '').slice(0, 10), t.side, t.quantity, t.price)),
  );

  const novas = [];
  const vistas = new Set();
  for (const i of validos) {
    const assetId = idDe[i.ticker];
    const k = chave(assetId, i.traded_at, i.side, i.quantity, i.price);
    if (jaTem.has(k) || vistas.has(k)) continue;
    vistas.add(k);
    novas.push({
      asset_id: assetId,
      side: i.side,
      quantity: Number(i.quantity),
      price: Number(i.price),
      traded_at: i.traded_at,
    });
  }

  if (novas.length) {
    const { error } = await sb.from('trades').insert(novas);
    if (error) return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    inseridas: novas.length,
    ignoradas: validos.length - novas.length,
    desconhecidos,
  });
}
