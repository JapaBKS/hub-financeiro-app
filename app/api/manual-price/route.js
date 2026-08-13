import { supabaseServer } from '../../../lib/supabase';
import { rota, ok, checar, ticker, numero } from '../../../lib/api';

export const POST = rota(async (b) => {
  const tk = ticker(b.ticker);
  const preco = numero(b.price, 'O preço', { min: 0.000001 });

  const sb = supabaseServer();
  checar(await sb.from('manual_prices').upsert(
    { ticker: tk, price: preco, updated_at: new Date().toISOString() },
    { onConflict: 'ticker' },
  ));
  return ok();
});

export const DELETE = rota(async (b) => {
  const tk = ticker(b.ticker);
  const sb = supabaseServer();
  checar(await sb.from('manual_prices').delete().eq('ticker', tk));
  return ok();
});
