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

  // cria os ativos que ainda não existem (o cliente manda ticker + classe)
  const novos = Array.isArray(b.novos) ? b.novos : [];
  const paraCriar = novos.filter((n) => n && n.ticker && n.class_id);
  if (paraCriar.length) {
    const { data: existentes } = await sb.from('assets').select('ticker')
      .in('ticker', paraCriar.map((n) => n.ticker));
    const jaExiste = new Set((existentes || []).map((a) => a.ticker));
    const inserir = paraCriar
      .filter((n) => !jaExiste.has(n.ticker))
      .map((n) => ({ ticker: n.ticker, class_id: Number(n.class_id), is_active: true }));
    if (inserir.length) {
      const { error } = await sb.from('assets').insert(inserir);
      if (error) return NextResponse.json({ ok: false, erro: `Erro ao cadastrar ativos: ${error.message}` }, { status: 500 });
    }
  }

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

  // Conta QUANTAS de cada assinatura já existem — execuções idênticas no mesmo dia
  // são legítimas (ordem partida), então não dá pra deduplicar por presença.
  const noBanco = {};
  (existentes || []).forEach((t) => {
    const k = chave(t.asset_id, (t.traded_at || '').slice(0, 10), t.side, t.quantity, t.price);
    noBanco[k] = (noBanco[k] || 0) + 1;
  });

  const novas = [];
  const vistas = {};
  for (const i of validos) {
    const assetId = idDe[i.ticker];
    const k = chave(assetId, i.traded_at, i.side, i.quantity, i.price);
    vistas[k] = (vistas[k] || 0) + 1;
    // se o banco já tem essa 1ª/2ª/3ª ocorrência, pula; senão insere
    if (vistas[k] <= (noBanco[k] || 0)) continue;
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
