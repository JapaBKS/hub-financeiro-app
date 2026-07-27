import { supabaseServer } from '../../lib/supabase';
import RecebidosMes from './recebidos-client';
import ImportarB3 from './importar-b3-client';
import ImportarB3Receber from './importar-b3-receber-client';
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
  const totalPorMes = {}; mesesAsc.forEach((m) => { totalPorMes[m.mes] = m.total; });
  // pendentes (a receber) por mês
  const pendPorMes = {};
  futuros.forEach((p) => { const k = (p.pay_date || '').slice(0, 7); if (k) pendPorMes[k] = (pendPorMes[k] || 0) + Number(p.amount); });

  // meses SEGUINTES (a receber): estritamente após o mês atual, marcados como futuro
  const mesAtualKey = hojeISO.slice(0, 7);
  const futMap = {};
  futuros.forEach((p) => {
    const k = (p.pay_date || '').slice(0, 7);
    if (!k || k <= mesAtualKey) return;
    if (!futMap[k]) futMap[k] = { mes: k, total: 0, acoes: 0, fiis: 0, itens: [], futuro: true };
    const v = Number(p.amount); const ehFii = p.classe === 'fiis';
    futMap[k].total += v;
    if (ehFii) futMap[k].fiis += v; else futMap[k].acoes += v;
    futMap[k].itens.push({ ticker: p.ticker, kind: p.kind, amount: v, pay_date: (p.pay_date || '').slice(0, 10), fii: ehFii });
  });
  const futMeses = Object.values(futMap);
  futMeses.forEach((m) => m.itens.sort((a, b) => a.pay_date.localeCompare(b.pay_date)));
  // junta com os recebidos e ordena do mais recente/futuro pro mais antigo
  const mesesComFuturo = [...meses, ...futMeses].sort((a, b) => b.mes.localeCompare(a.mes));

  let porMes = [];
  const chavesMes = [...new Set([...Object.keys(totalPorMes), ...Object.keys(pendPorMes)])].sort();
  if (chavesMes.length) {
    const [ya, ma] = chavesMes[0].split('-').map(Number);
    const fim = chavesMes[chavesMes.length - 1];
    let y = ya, mo = ma;
    while (true) {
      const key = `${y}-${String(mo).padStart(2, '0')}`;
      porMes.push({ key, total: totalPorMes[key] || 0, pendente: pendPorMes[key] || 0 });
      if (key === fim || key > fim) break;
      mo++; if (mo > 12) { mo = 1; y++; }
      if (porMes.length > 400) break;
    }
  }
  // por ano (recebido + a receber)
  const anoMap = {};
  mesesAsc.forEach((m) => { const a = m.mes.slice(0, 4); if (!anoMap[a]) anoMap[a] = { total: 0, pendente: 0 }; anoMap[a].total += m.total; });
  Object.entries(pendPorMes).forEach(([k, v]) => { const a = k.slice(0, 4); if (!anoMap[a]) anoMap[a] = { total: 0, pendente: 0 }; anoMap[a].pendente += v; });
  const porAno = Object.entries(anoMap).map(([key, o]) => ({ key, total: o.total, pendente: o.pendente })).sort((a, b) => a.key.localeCompare(b.key));

  return (
    <div className="wrap" style={{ maxWidth: 680 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Proventos</b><span>recebidos e a receber</span></div>
        </div>
        <a href="/" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>← painel</a>
      </header>
      <ImportarB3Receber />
      <ImportarB3 />
      <EvolucaoProventos porMes={porMes} porAno={porAno} />
      <RecebidosMes meses={mesesComFuturo} />
    </div>
  );
}
