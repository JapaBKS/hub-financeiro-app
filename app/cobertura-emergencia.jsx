import { supabaseServer } from '../lib/supabase';

// Mostra TODAS as classes com alvo em R$ (ex.: Emergência, Fluxo do mês).
// Na de emergência, mostra também quantos meses ela cobre — usando só a SUA
// parte das faturas do cartão (amount − amount_pai), já que as contas da casa
// no Caixa são pagas pelo seu pai.
export default async function CoberturaEmergencia({ meses = 6 }) {
  const sb = supabaseServer();

  const hoje = new Date();
  const primeiroDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - meses, 1);
  const iso = (d) => d.toISOString().slice(0, 10);

  const [{ data: itens }, { data: alloc }, { data: classes }] = await Promise.all([
    sb.from('v_card_invoice_items').select('bill_month, amount, amount_pai')
      .gte('bill_month', iso(inicio))
      .lt('bill_month', iso(primeiroDoMes)),
    sb.from('v_class_allocation').select('classe, valor'),
    sb.from('asset_classes').select('name, alvo_valor'),
  ]);

  const cofres = (classes || [])
    .filter((c) => c.alvo_valor != null && Number(c.alvo_valor) > 0)
    .map((c) => {
      const linha = (alloc || []).find((a) => a.classe === c.name);
      return { nome: c.name, alvo: Number(c.alvo_valor), valor: Number(linha?.valor || 0) };
    })
    .sort((a, b) => b.alvo - a.alvo);

  if (!cofres.length) return null;

  const porMes = {};
  (itens || []).forEach((i) => {
    const k = (i.bill_month || '').slice(0, 7);
    if (!k) return;
    const meu = Number(i.amount || 0) - Number(i.amount_pai || 0);
    if (meu <= 0) return;
    porMes[k] = (porMes[k] || 0) + meu;
  });
  const nMeses = Object.keys(porMes).length;
  const mediaMensal = nMeses ? Object.values(porMes).reduce((s, v) => s + v, 0) / nMeses : 0;

  const ehEmergencia = (n) => ['emergência', 'emergencia', 'reserva'].includes((n || '').toLowerCase());
  const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <section className="card" style={{ padding: '12px 20px 14px', marginBottom: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '.03em', textTransform: 'uppercase', marginBottom: 8 }}>
        Cofres · alvo em R$
      </div>

      {cofres.map((c, i) => {
        const falta = c.alvo - c.valor;
        const progresso = Math.min(c.valor / c.alvo, 1);
        const cor = falta > 0 ? 'var(--amber)' : 'var(--up)';
        const cobertura = ehEmergencia(c.nome) && mediaMensal > 0 ? c.valor / mediaMensal : null;
        return (
          <div key={c.nome} style={{ marginTop: i === 0 ? 0 : 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.nome}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: cor, marginLeft: 8 }}>
                  {fmt(c.valor)}
                </span>
                <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}> de {fmt(c.alvo)}</span>
              </div>
              {cobertura != null && (
                <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                  cobre {cobertura.toFixed(1).replace('.', ',')} meses
                </span>
              )}
            </div>

            <div style={{ height: 7, borderRadius: 4, background: 'var(--track)', overflow: 'hidden', marginTop: 7 }}>
              <div className="bar-grow-x" style={{ width: `${progresso * 100}%`, height: '100%', background: cor, borderRadius: 4, animationDelay: `${0.1 + i * 0.06}s` }} />
            </div>

            <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 4 }}>
              {falta > 0
                ? `faltam ${fmt(falta)}`
                : `${fmt(-falta)} acima do alvo — disponível para investir`}
            </div>
          </div>
        );
      })}

      {mediaMensal > 0 && (
        <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 10, borderTop: '1px solid var(--line-soft)', paddingTop: 8 }}>
          sua parte no cartão: {fmt(mediaMensal)}/mês · média de {nMeses} {nMeses === 1 ? 'mês' : 'meses'}
        </div>
      )}
    </section>
  );
}
