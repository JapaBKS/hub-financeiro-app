import { supabaseServer } from '../../lib/supabase';
import FormDividendos from './form-client';
import RecebidosMes from './recebidos-client';
import ImportarB3 from './importar-b3-client';
import PorAtivo from './por-ativo-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dividendos() {
  const sb = supabaseServer();
  const [{ data: pend }, { data: recebidos }, { data: positions }] = await Promise.all([
    sb.from('dividends_pending').select('ticker, pay_date, kind, amount, classe').order('pay_date'),
    sb.from('dividends').select('ticker, paid_at, kind, amount, assets(asset_classes(name))').order('paid_at', { ascending: false }),
    sb.from('v_positions').select('ticker, quantidade, preco_medio'),
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

  // --- por ativo: total (todo período e 12 meses) + custo p/ yield ---
  const doze = new Date(); doze.setFullYear(doze.getFullYear() - 1);
  const dozeISO = doze.toISOString().slice(0, 10);
  const custoDe = {};
  (positions || []).forEach((p) => {
    const c = Number(p.quantidade) * Number(p.preco_medio);
    if (c > 0) custoDe[p.ticker] = c;
  });
  const mapAtivo = {};
  for (const d of recebidos || []) {
    const t = d.ticker;
    if (!t) continue;
    if (!mapAtivo[t]) mapAtivo[t] = { ticker: t, fii: (d.assets?.asset_classes?.name === 'FIIS'), totalAll: 0, total12m: 0 };
    const v = Number(d.amount);
    mapAtivo[t].totalAll += v;
    if ((d.paid_at || '').slice(0, 10) >= dozeISO) mapAtivo[t].total12m += v;
  }
  const ativos = Object.values(mapAtivo).map((a) => ({ ...a, custo: custoDe[a.ticker] || null }));

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
      <ImportarB3 />
      <PorAtivo ativos={ativos} />
      <RecebidosMes meses={meses} />
    </div>
  );
}
