import { NextResponse } from 'next/server';
import { supabaseServer } from '../../../lib/supabase';
import { hojeISO } from '../../../lib/dominio/datas';
import { detectarPadraoPagamento } from '../../../lib/dominio/proventos';

// Importa a aba "a receber" da B3 -> dividends_pending.
// A B3 é a fonte da verdade do que está POR VIR: substitui todos os pendentes
// futuros (pay_date >= hoje) pelos itens colados. Pendentes já vencidos (que o
// job vai arquivar) não são tocados. Preserva duplicatas legítimas (não deduplica).
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const itens = Array.isArray(b.itens) ? b.itens : null;
  if (!itens || !itens.length) return NextResponse.json({ ok: false, erro: 'Lista vazia.' }, { status: 400 });

  const sb = supabaseServer();
  const { data: assets } = await sb.from('assets').select('id, ticker');
  const idDe = {};
  (assets || []).forEach((a) => { idDe[a.ticker] = a.id; });

  const hoje = hojeISO();

  // cópia do celular: só o mês. O dia vem do padrão de pagamento do ativo (últimos
  // proventos); sem histórico, último dia do mês. Nunca antes de hoje (ainda não pagou).
  const semDia = [...new Set(itens.filter((it) => !it.pay_date && it.mes).map((it) => it.ticker))];
  const diaDe = {};
  if (semDia.length) {
    const { data: hist } = await sb.from('dividends').select('ticker, paid_at').in('ticker', semDia)
      .order('paid_at', { ascending: false }).limit(500);
    const porTicker = {};
    (hist || []).forEach((d) => { (porTicker[d.ticker] ||= []).push(String(d.paid_at).slice(0, 10)); });
    Object.entries(porTicker).forEach(([t, datas]) => {
      const p = detectarPadraoPagamento(datas.slice(0, 12));
      diaDe[t] = p.tipo === 'dia-fixo' ? p.diaTipico : Number(datas[0].slice(8, 10));
    });
  }
  const estimarData = (it) => {
    const [a, m] = it.mes.split('-').map(Number);
    const ultimo = new Date(Date.UTC(a, m, 0)).getUTCDate();
    const d = `${it.mes}-${String(Math.min(diaDe[it.ticker] || ultimo, ultimo)).padStart(2, '0')}`;
    return d < hoje ? hoje : d;
  };

  const linhas = itens
    .filter((it) => it.ticker && (it.pay_date || /^\d{4}-\d{2}$/.test(it.mes || '')))
    .map((it) => ({
      ticker: it.ticker,
      asset_id: idDe[it.ticker] || null,
      pay_date: it.pay_date || estimarData(it),
      kind: it.kind,
      amount: Number(it.amount),
      classe: it.classe || (/11$/.test(it.ticker) ? 'fiis' : 'acoes'),
    }));

  // apaga os futuros atuais e insere os da B3 (substituição)
  const { error: delErr } = await sb.from('dividends_pending').delete().gte('pay_date', hoje);
  if (delErr) return NextResponse.json({ ok: false, erro: delErr.message }, { status: 500 });

  if (linhas.length) {
    const { error: insErr } = await sb.from('dividends_pending').insert(linhas);
    if (insErr) return NextResponse.json({ ok: false, erro: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, inseridos: linhas.length, substituido: true });
}
