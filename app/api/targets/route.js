import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, ErroDeUso, id, numero, texto } from '../../../lib/api';

// Recebe a lista completa de um grupo e reconcilia: cria/atualiza o peso de
// cada ativo e zera o alvo de quem saiu da lista.
export const POST = rota(async (b) => {
  const classe = id(b.class_id, 'a classe');
  if (!Array.isArray(b.itens)) throw new ErroDeUso('A lista de ativos é inválida.');

  const sb = supabaseServer();
  const tickers = [];

  for (const it of b.itens) {
    const tk = texto(it.ticker, 'o ticker', { obrigatorio: false }).toUpperCase();
    if (!tk) continue;
    const peso = numero(it.pct ?? 0, 'O peso', { min: 0 });  // fração (0-1)
    const congelado = !!it.congelado;
    tickers.push(tk);

    const { data: existente } = await sb.from('assets').select('id').eq('ticker', tk).maybeSingle();
    if (existente) {
      checar(await sb.from('assets')
        .update({ target_pct: peso, class_id: classe, is_active: true, congelado })
        .eq('id', existente.id));
    } else {
      checar(await sb.from('assets')
        .insert({ ticker: tk, class_id: classe, target_pct: peso, is_active: true, congelado }));
    }
  }

  const doGrupo = checar(await sb.from('assets')
    .select('id, ticker').eq('class_id', classe).not('target_pct', 'is', null));
  const remover = (doGrupo || []).filter((a) => !tickers.includes(a.ticker)).map((a) => a.id);
  if (remover.length) checar(await sb.from('assets').update({ target_pct: null }).in('id', remover));

  return ok();
});
