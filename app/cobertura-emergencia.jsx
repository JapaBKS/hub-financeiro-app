import { supabaseServer } from '../lib/supabase';

// Mostra a reserva em MESES de despesa real (média do Caixa), em vez de %.
// Usa a classe "Emergência" se existir; senão cai pra "Reserva".
export default async function CoberturaEmergencia({ meses = 6 }) {
  const sb = supabaseServer();

  const hoje = new Date();
  const primeiroDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - meses, 1);
  const iso = (d) => d.toISOString().slice(0, 10);

  const [{ data: saidas }, { data: classes }] = await Promise.all([
    sb.from('cashbook').select('entry_date, amount')
      .eq('kind', 'saida')
      .gte('entry_date', iso(inicio))
      .lt('entry_date', iso(primeiroDoMes)),
    sb.from('v_class_allocation').select('classe, valor'),
  ]);

  const porMes = {};
  (saidas || []).forEach((s) => {
    const k = (s.entry_date || '').slice(0, 7);
    if (!k) return;
    porMes[k] = (porMes[k] || 0) + Number(s.amount || 0);
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
          <div>gasto médio {fmt(mediaMensal)}/mês</div>
        </div>
      </div>

      <div style={{ height: 8, borderRadius: 5, background: 'var(--track)', overflow: 'hidden', marginTop: 12, position: 'relative' }}>
        <div className="bar-grow-x" style={{ width: `${preenchido * 100}%`, height: '100%', background: cor, borderRadius: 5 }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: 'var(--ink-faint)' }}>
        <span>{recado}</span>
        <span>meta {alvoMeses} meses</span>
      </div>
    </section>
  );
}
