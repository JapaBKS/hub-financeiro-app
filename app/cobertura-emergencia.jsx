import { supabaseServer } from '../lib/supabase';

// Reserva de emergência: progresso até o alvo em R$ + quantos meses isso cobre.
// A despesa considera SÓ a sua parte das faturas do cartão (amount − amount_pai),
// porque as contas da casa no Caixa são pagas pelo seu pai.
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

  // classe da reserva: prioriza uma com alvo em R$ definido; senão Emergência/Reserva
  const comAlvo = (classes || []).filter((c) => c.alvo_valor != null && Number(c.alvo_valor) > 0);
  const nomeBusca = ['emergência', 'emergencia', 'reserva'];
  const escolhida =
    comAlvo.find((c) => nomeBusca.includes((c.name || '').toLowerCase())) ||
    comAlvo[0] ||
    (classes || []).find((c) => nomeBusca.includes((c.name || '').toLowerCase()));
  if (!escolhida) return null;

  const linha = (alloc || []).find((c) => c.classe === escolhida.name);
  const valor = Number(linha?.valor || 0);
  const alvo = escolhida.alvo_valor != null ? Number(escolhida.alvo_valor) : null;

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
  const cobertura = mediaMensal > 0 ? valor / mediaMensal : null;

  const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // sem alvo definido: mostra só a cobertura em meses
  const temAlvo = alvo != null && alvo > 0;
  const progresso = temAlvo ? Math.min(valor / alvo, 1) : 0;
  const falta = temAlvo ? alvo - valor : 0;
  const cor = !temAlvo
    ? 'var(--forest-2)'
    : falta > 0 ? 'var(--amber)' : 'var(--up)';

  return (
    <section className="card" style={{ padding: '14px 20px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '.03em', textTransform: 'uppercase' }}>
            {escolhida.name}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: cor, marginTop: 2 }}>
            {fmt(valor)}
            {temAlvo && <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontWeight: 500 }}> de {fmt(alvo)}</span>}
          </div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--ink-faint)' }}>
          {cobertura != null && <div>cobre {cobertura.toFixed(1).replace('.', ',')} meses</div>}
          {mediaMensal > 0 && <div>sua parte no cartão: {fmt(mediaMensal)}/mês</div>}
        </div>
      </div>

      {temAlvo && (
        <>
          <div style={{ height: 8, borderRadius: 5, background: 'var(--track)', overflow: 'hidden', marginTop: 12 }}>
            <div className="bar-grow-x" style={{ width: `${progresso * 100}%`, height: '100%', background: cor, borderRadius: 5 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: 'var(--ink-faint)', gap: 8, flexWrap: 'wrap' }}>
            <span>
              {falta > 0
                ? `faltam ${fmt(falta)} para completar`
                : `${fmt(-falta)} acima do alvo — disponível para investir`}
            </span>
            <span>{(progresso * 100).toFixed(0)}%</span>
          </div>
        </>
      )}

      {!temAlvo && (
        <div style={{ fontSize: 10.5, color: 'var(--ink-faint)', marginTop: 8 }}>
          Defina um alvo em R$ para esta classe em Alvos → Metas por classe.
        </div>
      )}
    </section>
  );
}
