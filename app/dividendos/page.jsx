import { supabaseServer } from '../../lib/supabase';
import FormDividendos from './form-client';
import RecebidosMes from './recebidos-client';
import ImportarB3 from './importar-b3-client';
import EvolucaoProventos from './evolucao-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Dividendos() {
  const sb = supabaseServer();
  const [{ data: pend }, { data: recebidos }] = await Promise.all([
    sb.from('dividends_pending').select('ticker, pay_date, kind, amount, classe').order('pay_date'),
    sb.from('dividends').select('id, ticker, paid_at, kind, amount, assets(asset_classes(name))').order('paid_at', { ascending: false }),
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
    mapMes[mes].itens.push({ id: d.id, ticker: d.ticker, kind: d.kind, amount: val, fii: ehFii, paid_at: (d.paid_at || '').slice(0, 10) });
  }
  const meses = Object.values(mapMes).sort((a, b) => b.mes.localeCompare(a.mes));
  // dentro do mês, ordena por data (mais recente primeiro); empata pelo maior valor
  meses.forEach((m) => m.itens.sort((a, b) => (b.paid_at || '').localeCompare(a.paid_at || '') || (b.amount - a.amount)));

  // --- séries de evolução (ascendente): preenche meses vazios entre o primeiro e o último ---
  const mesesAsc = [...meses].sort((a, b) => a.mes.localeCompare(b.mes)).filter((m) => m.mes >= '2000-01');
  let porMes = [];
  if (mesesAsc.length) {
    const totalPorMes = {}; mesesAsc.forEach((m) => { totalPorMes[m.mes] = m.total; });
    const [ya, ma] = mesesAsc[0].mes.split('-').map(Number);
    const fim = hojeISO.slice(0, 7);
    let y = ya, mo = ma;
    while (true) {
      const key = `${y}-${String(mo).padStart(2, '0')}`;
      porMes.push({ key, total: totalPorMes[key] || 0 });
      if (key === fim || key > fim) break;
      mo++; if (mo > 12) { mo = 1; y++; }
      if (porMes.length > 400) break;
    }
  }
  const anoMap = {};
  mesesAsc.forEach((m) => { const a = m.mes.slice(0, 4); anoMap[a] = (anoMap[a] || 0) + m.total; });
  const porAno = Object.entries(anoMap).map(([key, total]) => ({ key, total })).sort((a, b) => a.key.localeCompare(b.key));

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
      <EvolucaoProventos porMes={porMes} porAno={porAno} />
      <RecebidosMes meses={meses} />
    </div>
  );
}
