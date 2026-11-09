import { supabaseServer, lerTudo } from '../../lib/supabase';
import { calcularHistorico } from '../../lib/dominio/posicoes';
import { agruparVendasPorMes } from '../../lib/dominio/apuracao';
import ApuracaoLista from './apuracao-client';

// Aba "Mês a mês" da tela Impostos: resultado das vendas por mês e DARFs.
export default async function Apuracao() {
  const sb = supabaseServer();
  const [{ data: trades }, { data: darfsPagas }, { data: eventos }] = await Promise.all([
    lerTudo((de, ate) => sb.from('trades')
      .select('id, traded_at, side, quantity, price, assets(ticker, asset_classes(name))')
      .order('traded_at', { ascending: true })
      .order('id', { ascending: true })
      .range(de, ate)),
    sb.from('darf_payments').select('mes_apuracao, paid_at'),
    sb.from('corporate_events').select('id, ticker, event_date, tipo, fator, nota').order('event_date'),
  ]);

  const pagos = {};
  (darfsPagas || []).forEach((d) => { pagos[d.mes_apuracao] = d.paid_at; });

  // Toda a regra de custo médio, desdobramento e resultado por venda
  // vem do domínio — esta página só AGRUPA o resultado por mês.
  const { vendas, negativos } = calcularHistorico(trades, eventos);

  const lista = agruparVendasPorMes(vendas);

  return <ApuracaoLista meses={lista} pagos={pagos} eventos={eventos || []} suspeitos={negativos} />;
}
