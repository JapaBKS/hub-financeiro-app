import { supabaseServer } from '../lib/supabase';

// "Munição": dinheiro que já é seu mas ainda não foi alocado (classes fora do
// rateio, ex.: "A investir"), + para onde ele deveria ir — a classe/ativo mais
// atrasado em relação à meta.
export default async function Municao() {
  const sb = supabaseServer();

  const [{ data: alloc }, { data: classes }, { data: assets }] = await Promise.all([
    sb.from('v_class_allocation').select('classe, valor'),
    sb.from('asset_classes').select('id, name, target_pct, alvo_valor, fora_rateio'),
    sb.from('assets').select('ticker, target_pct, class_id').gt('target_pct', 0),
  ]);

  const valorDe = {};
  (alloc || []).forEach((a) => { valorDe[a.classe] = Number(a.valor || 0); });

  const foraDoRateio = (c) => !!c.fora_rateio || (c.alvo_valor != null && Number(c.alvo_valor) > 0);

  // munição = soma das classes marcadas como "fora do rateio" (sem alvo em R$)
  const partes = (classes || [])
    .filter((c) => c.fora_rateio && !(c.alvo_valor != null && Number(c.alvo_valor) > 0))
    .map((c) => ({ nome: c.name, valor: valorDe[c.name] || 0 }))
    .filter((p) => p.valor > 0)
    .sort((a, b) => b.valor - a.valor);
  const municao = partes.reduce((s, p) => s + p.valor, 0);

  if (municao <= 0) return null;

  // total que disputa os 100%
  const total = (classes || [])
    .filter((c) => !foraDoRateio(c))
    .reduce((s, c) => s + (valorDe[c.name] || 0), 0);

  // maior gap por classe
  const gaps = (classes || [])
    .filter((c) => !foraDoRateio(c) && Number(c.target_pct) > 0)
    .map((c) => {
      const alvoRs = Number(c.target_pct) * total;
      const atual = valorDe[c.name] || 0;
      const doClasse = (assets || []).filter((a) => a.class_id === c.id);
      const ticker = doClasse.length === 1 ? doClasse[0].ticker : null;
      return { nome: c.name, ticker, falta: alvoRs - atual };
    })
    .filter((g) => g.falta > 0)
    .sort((a, b) => b.falta - a.falta);

  const alvo = gaps[0] || null;
  const fmt = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <section className="card" style={{ padding: '14px 20px 16px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--ink-faint)', letterSpacing: '.03em', textTransform: 'uppercase' }}>
            Disponível para investir
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, color: 'var(--forest-2)', marginTop: 2 }}>
            {fmt(municao)}
          </div>
        </div>
        <a href="/recomendacoes" style={{ fontSize: 12, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>
          ver recomendações →
        </a>
      </div>

      {partes.length > 1 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6, fontSize: 11, color: 'var(--ink-faint)' }}>
          {partes.map((p) => (
            <span key={p.nome}>{p.nome} <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink-soft)' }}>{fmt(p.valor)}</b></span>
          ))}
        </div>
      )}

      {alvo ? (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)', fontSize: 12.5, color: 'var(--ink-soft)' }}>
          mais atrasado: <b style={{ fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>{alvo.ticker || alvo.nome}</b>
          <span style={{ color: 'var(--ink-faint)' }}> · {fmt(alvo.falta)} abaixo do alvo</span>
          {gaps[1] && (
            <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 3 }}>
              depois: {gaps[1].ticker || gaps[1].nome} · faltam {fmt(gaps[1].falta)}
            </div>
          )}
        </div>
      ) : (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line-soft)', fontSize: 12.5, color: 'var(--ink-faint)' }}>
          Tudo no alvo — distribua conforme as metas.
        </div>
      )}
    </section>
  );
}
