import { supabaseServer } from '../../lib/supabase';
import { calcularHistorico } from '../../lib/dominio/posicoes';
import { agruparVendasPorMes } from '../../lib/dominio/apuracao';
import ApuracaoLista from './lista-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Apuracao() {
  const sb = supabaseServer();
  const [{ data: trades }, { data: darfsPagas }, { data: eventos }] = await Promise.all([
    sb.from('trades')
      .select('id, traded_at, side, quantity, price, assets(ticker, asset_classes(name))')
      .order('traded_at', { ascending: true })
      .order('id', { ascending: true }),
    sb.from('darf_payments').select('mes_apuracao, paid_at'),
    sb.from('corporate_events').select('id, ticker, event_date, tipo, fator, nota').order('event_date'),
  ]);

  const pagos = {};
  (darfsPagas || []).forEach((d) => { pagos[d.mes_apuracao] = d.paid_at; });

  // Toda a regra de custo médio, desdobramento e resultado por venda
  // vem do domínio — esta página só AGRUPA o resultado por mês.
  const { vendas, negativos } = calcularHistorico(trades, eventos);

  const lista = agruparVendasPorMes(vendas);

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="topbar">
        <div className="brand">
          <div><b>Apuração</b><span>resultado por mês · conferência</span></div>
        </div>
        <a href="/biblioteca" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>biblioteca →</a>
      </header>
      <ApuracaoLista meses={lista} pagos={pagos} eventos={eventos || []} suspeitos={negativos} />
    </div>
  );
}
