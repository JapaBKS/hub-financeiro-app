import { supabaseServer } from '../../lib/supabase';
import CaixaView from './view-client';
import ImportarCaixa from './importar-client';
import AlertaContas from '../alerta-contas';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Caixa() {
  const sb = supabaseServer();
  const [{ data: rows }, { data: bills }] = await Promise.all([
    sb.from('cashbook').select('*').order('entry_date', { ascending: true }),
    sb.from('recurring_bills').select('*').eq('active', true).order('name'),
  ]);

  // agrupa por mês (YYYY-MM) e calcula saldo acumulado (só pagos entram no saldo)
  const porMes = {};
  (rows || []).forEach((r) => {
    const mes = (r.entry_date || '').slice(0, 7);
    if (!mes) return;
    if (!porMes[mes]) porMes[mes] = { mes, itens: [], entradasPagas: 0, saidasPagas: 0, entradasPend: 0, saidasPend: 0 };
    const g = porMes[mes];
    g.itens.push(r);
    const v = Number(r.amount);
    if (r.kind === 'entrada') { if (r.paid) g.entradasPagas += v; else g.entradasPend += v; }
    else { if (r.paid) g.saidasPagas += v; else g.saidasPend += v; }
  });

  const meses = Object.keys(porMes).sort();
  let saldoAnterior = 0;
  let primeiroSaldo = null;
  const resumo = meses.map((mes) => {
    const g = porMes[mes];
    const resultadoMes = g.entradasPagas - g.saidasPagas;       // movimento líquido do mês (pagos)
    const saldoInicial = saldoAnterior;                          // vem do mês anterior
    const saldoDisponivel = saldoInicial + resultadoMes;         // saldo que fica
    if (primeiroSaldo == null) primeiroSaldo = saldoDisponivel;
    const aumentoMensal = saldoDisponivel - saldoInicial;        // vs mês anterior
    const aumentoTotal = saldoDisponivel - primeiroSaldo;        // vs primeiro mês
    saldoAnterior = saldoDisponivel;
    return {
      mes,
      itens: g.itens,
      saldoInicial,
      entradasPagas: g.entradasPagas,
      saidasPagas: g.saidasPagas,
      entradasPend: g.entradasPend,
      saidasPend: g.saidasPend,
      saldoDisponivel,
      aumentoMensal,
      aumentoTotal,
    };
  });

  // categorias já usadas (pra sugerir)
  const categorias = [...new Set((rows || []).map((r) => r.category).filter(Boolean))].sort();

  return (
    <div className="wrap" style={{ maxWidth: 720 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Caixa</b><span>entradas e saídas do mês</span></div>
        </div>
        <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
      </header>
      <AlertaContas dias={3} />
      <CaixaView resumo={resumo} categorias={categorias} bills={bills || []} />
      <ImportarCaixa />
    </div>
  );
}
