import { supabaseServer } from '../../lib/supabase';
import ListaNegociacoes from './lista-client';
import RegistrarNegociacao from './registrar-client';
import ImportarNegociacoesB3 from './importar-b3-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Negociacoes() {
  const sb = supabaseServer();
  const [{ data: trades }, { data: assets }, { data: classes }, { data: eventos }] = await Promise.all([
    sb.from('trades')
      .select('id, traded_at, side, quantity, price, assets(ticker)')
      .order('traded_at', { ascending: true })
      .order('id', { ascending: true }),
    sb.from('assets').select('ticker').order('ticker'),
    sb.from('asset_classes').select('id, name').order('name'),
    sb.from('corporate_events').select('ticker, event_date, fator').order('event_date'),
  ]);

  // saldo de cada ativo APÓS cada negociação, aplicando desdobramentos/grupamentos
  // na ordem cronológica (evento entra antes das negociações do mesmo dia)
  const linha = [
    ...(trades || []).map((t) => ({
      kind: 'trade', dia: (t.traded_at || '').slice(0, 10), t,
      ticker: t.assets?.ticker || '?',
    })),
    ...(eventos || []).map((e) => ({
      kind: 'evento', dia: (e.event_date || '').slice(0, 10),
      ticker: (e.ticker || '').toUpperCase(), fator: Number(e.fator) || 1,
    })),
  ].sort((a, b) => a.dia.localeCompare(b.dia)
    || (a.kind === 'evento' ? -1 : b.kind === 'evento' ? 1 : (a.t.id - b.t.id)));

  const saldo = {};
  const saldoApos = {};
  linha.forEach((x) => {
    if (!x.ticker) return;
    if (saldo[x.ticker] == null) saldo[x.ticker] = 0;
    if (x.kind === 'evento') { saldo[x.ticker] *= x.fator; return; }
    const q = Number(x.t.quantity) || 0;
    saldo[x.ticker] += x.t.side === 'compra' ? q : -q;
    saldoApos[x.t.id] = saldo[x.ticker];
  });

  const flat = (trades || []).map((t) => ({
    id: t.id,
    ticker: t.assets?.ticker || '?',
    traded_at: t.traded_at,
    side: t.side,
    quantity: t.quantity,
    price: t.price,
    saldo: saldoApos[t.id] ?? null,
  })).reverse(); // volta pra ordem mais recente primeiro

  return (
    <div className="wrap" style={{ maxWidth: 640 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Negociações</b><span>{flat.length} no total</span></div>
        </div>
        <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
      </header>
      <ImportarNegociacoesB3 assets={assets || []} classes={classes || []} />
      <RegistrarNegociacao assets={assets || []} classes={classes || []} />
      <ListaNegociacoes trades={flat} />
    </div>
  );
}
