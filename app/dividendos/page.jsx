import { supabaseServer } from '../../lib/supabase';
import FormDividendos from './form-client';
import RecebidosMes from './recebidos-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dividendos() {
  const sb = supabaseServer();
  const [{ data: pend }, { data: recebidos }] = await Promise.all([
    sb.from('dividends_pending').select('ticker, pay_date, kind, amount, classe').order('pay_date'),
    sb.from('dividends').select('ticker, paid_at, kind, amount, assets(asset_classes(name))').order('paid_at', { ascending: false }),
  ]);

  const hojeISO = new Date().toISOString().slice(0, 10);
  const futuros = (pend || []).filter((p) => (p.pay_date || '').slice(0, 10) >= hojeISO);
  const totalAtual = futuros.reduce((s, p) => s + Number(p.amount), 0);
  const fiisAtual = futuros.filter((p) => p.classe === 'fiis').reduce((s, p) => s + Number(p.amount), 0);
  const acoesAtual = totalAtual - fiisAtual;

  // recebidos por mês (todo o histórico), com split ações/fiis e detalhe por ativo
  const mapMes = {};
  for (const d of recebidos || []) {
    const mes = (d.paid_at || '').slice(0, 7);
    if (!mes) continue;
    const nome = d.assets?.asset_classes?.name || '';
    const ehFii = nome === 'FIIS';
    const val = Number(d.amount);
    if (!mapMes[mes]) mapMes[mes] = { mes, total: 0, acoes: 0, fiis: 0, itens: [] };
    mapMes[mes].total += val;
    if (ehFii) mapMes[mes].fiis += val; else mapMes[mes].acoes += val;
    mapMes[mes].itens.push({ ticker: d.ticker, kind: d.kind, amount: val, fii: ehFii, paid_at: (d.paid_at || '').slice(0, 10) });
  }
  const meses = Object.values(mapMes).sort((a, b) => b.mes.localeCompare(a.mes));
  meses.forEach((m) => m.itens.sort((a, b) => b.amount - a.amount));

  return (
    <div className="wrap" style={{ maxWidth: 680 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Proventos a receber</b><span>sincronizar com a Rico</span></div>
        </div>
        <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
      </header>
      <FormDividendos totalAtual={totalAtual} qtdAtual={(pend || []).length} acoesAtual={acoesAtual} fiisAtual={fiisAtual} />
      <RecebidosMes meses={meses} />
    </div>
  );
}
