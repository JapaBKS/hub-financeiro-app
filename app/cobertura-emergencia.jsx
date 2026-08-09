import { supabaseServer } from '../lib/supabase';

// Reserva em MESES de despesa real (em vez de %).
// Considera SÓ a sua parte das faturas do cartão (amount − amount_pai),
// porque as contas da casa no Caixa são pagas pelo seu pai.
export default async function CoberturaEmergencia({ meses = 6 }) {
  const sb = supabaseServer();

  const hoje = new Date();
  const primeiroDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - meses, 1);
  const iso = (d) => d.toISOString().slice(0, 10);

  const [{ data: itens }, { data: classes }] = await Promise.all([
    sb.from('v_card_invoice_items').select('bill_month, amount, amount_pai')
      .gte('bill_month', iso(inicio))
      .lt('bill_month', iso(primeiroDoMes)),
    sb.from('v_class_allocation').select('classe, valor'),
  ]);

  const porMes = {};
  (itens || []).forEach((i) => {
    const k = (i.bill_month || '').slice(0, 7);
    if (!k) return;
    const meu = Number(i.amount || 0) - Number(i.amount_pai || 0);
    if (meu <= 0) return; // parcelas 100% do pai não entram
    porMes[k] = (porMes[k] || 0) + meu;
  });

  const mesesComDado = Object.keys(porMes).length;
  if (!mesesComDado) return null;

  const mediaMensal = Object.values(porMes).reduce((s, v) => s + v, 0) / mesesComDado;
  if (!(mediaMensal > 0)) return null;

  const achar = (nome) => (classes || []).find((c) => (c.classe || '').toLowerCase() === nome);
  const fonte = achar('emergência') || achar('emergencia') || achar('reserva');
  if (!fonte) return null;
  const valor = Number(fonte.valor || 0);

  const cobertura = valor / mediaMensal;
  const alvoMeses = 6;
  const preenchido = Math.min(cobertura / alvoMeses, 1);

  const cor = cobertura < 3 ? 'var(--down)' : cobertura < 6 ? 'var(--amber)' : 'var(--up)';
  const recado = cobertura < 3
    ? 'abaixo do mínimo usual (3 meses)'
    : cobertura < 6
      ? 'dentro da faixa, caminhando pros 6 meses'
      : 'faixa confortável — o excedente pode ir pros investimentos';

  const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <section className="card" style={{ padding: '14px 20px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '.03em', textTransform: 'uppercase' }}>
            {fonte.classe} · cobertura
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: cor, marginTop: 2 }}>
            {cobertura.toFixed(1).replace('.', ',')} meses
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--ink-faint)' }}>
          <div>{fmt(valor)} guardados</div>
          <div>sua parte no cartão: {fmt(mediaMensal)}/mês</div>
        </div>
      </div>

      <div style={{ height: 8, borderRadius: 5, background: 'var(--track)', overflow: 'hidden', marginTop: 12 }}>
        <div className="bar-grow-x" style={{ width: `${preenchido * 100}%`, height: '100%', background: cor, borderRadius: 5 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: 'var(--ink-faint)', gap: 8, flexWrap: 'wrap' }}>
        <span>{recado}</span>
        <span>média de {mesesComDado} {mesesComDado === 1 ? 'mês' : 'meses'} · meta {alvoMeses}</span>
      </div>
    </section>
  );
}
