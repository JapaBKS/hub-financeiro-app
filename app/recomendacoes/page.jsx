import { supabaseServer } from '../../lib/supabase';
import { brl, brlShort, pct } from '../../lib/format';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// tolerância: aceita até X% do lado "errado" do PM antes de virar aviso
const TOL = 0.03;

export default async function Recomendacoes() {
  const sb = supabaseServer();
  const [{ data: pos }, { data: alvoAssets }, { data: alloc }, { data: classes }, { data: precos }] = await Promise.all([
    sb.from('v_positions').select('*'),
    sb.from('assets').select('ticker, target_pct, asset_classes(name, target_pct)').gt('target_pct', 0),
    sb.from('v_class_allocation').select('valor'),
    sb.from('asset_classes').select('name, target_pct'),
    sb.from('prices').select('ticker, price'),
  ]);

  const precoDe = {};
  (precos || []).forEach((p) => { precoDe[p.ticker] = Number(p.price); });
  const pmDe = {};
  (pos || []).forEach((p) => { if (Number(p.preco_medio) > 0) pmDe[p.ticker] = Number(p.preco_medio); });

  // classes com pesos por ativo (têm vários ativos dentro)
  const GRUPOS = ['Ações BR', 'BDRS', 'FIIS'];
  const metaClasse = {};
  (classes || []).forEach((c) => { metaClasse[c.name] = Number(c.target_pct) || 0; });

  const total = (alloc || []).reduce((s, c) => s + Number(c.valor), 0) || 1;
  const posMap = {};
  (pos || []).forEach((p) => { if (p.preco_atual != null) posMap[p.ticker] = p; });

  const universo = new Map();
  (alvoAssets || []).forEach((a) => universo.set(a.ticker, {
    ticker: a.ticker,
    target: Number(a.target_pct) * Number(a.asset_classes?.target_pct || 0),
    classe: a.asset_classes?.name,
  }));
  Object.values(posMap).forEach((p) => {
    if (!universo.has(p.ticker)) {
      // classe de ativo único (ex.: BTC): o ativo é 100% da classe -> alvo = meta da classe.
      // classe com grupo (Ações/BDRs/FIIs) sem peso cadastrado -> fora da lista (alvo 0).
      const target = GRUPOS.includes(p.classe) ? 0 : (metaClasse[p.classe] || 0);
      universo.set(p.ticker, { ticker: p.ticker, target, classe: p.classe });
    }
  });

  const itens = [];
  for (const u of universo.values()) {
    const p = posMap[u.ticker];
    const held = !!p;
    const pesoReal = held ? Number(p.valor_carteira) / total : 0;
    const gap = u.target - pesoReal; // >0 = abaixo do alvo
    const sugestaoRs = gap * total;
    const d = held && Number(p.preco_medio) > 0
      ? (Number(p.preco_atual) - Number(p.preco_medio)) / Number(p.preco_medio)
      : null;
    const dPct = d != null ? Math.round(Math.abs(d) * 100) : null;

    let acao = 'manter', tom = 'hold', motivo = 'no alvo', forca = 0, nova = false, atencao = false;

    if (!held && u.target > 0) {
      acao = 'comprar'; tom = 'buy'; motivo = 'nova posição — você ainda não tem'; forca = 5; nova = true;
    } else if (held) {
      const abaixoAlvo = gap > 0.002;
      const acimaAlvo = gap < -0.005;

      if (abaixoAlvo) {
        acao = 'comprar'; tom = 'buy';
        const precoOk = d != null && d <= TOL; // no PM ou até 3% acima
        if (precoOk) {
          if (d < -0.005) { motivo = `abaixo do alvo · ${dPct}% abaixo do PM`; forca = 4; }
          else { motivo = 'abaixo do alvo · preço perto do PM'; forca = 3; }
        } else {
          atencao = true; forca = 1;
          motivo = d != null ? `abaixo do alvo, mas ${dPct}% acima do PM` : 'abaixo do alvo · sem cotação';
        }
      } else if (acimaAlvo) {
        acao = 'reduzir'; tom = 'sell';
        const precoOk = d != null && d >= -TOL; // no PM ou até 3% abaixo (não vende no prejuízo)
        if (precoOk) {
          if (d > 0.005) { motivo = `acima do alvo · ${dPct}% acima do PM`; forca = 4; }
          else { motivo = 'acima do alvo · preço perto do PM'; forca = 3; }
        } else {
          atencao = true; forca = 1;
          motivo = d != null ? `acima do alvo, mas ${dPct}% abaixo do PM` : 'acima do alvo · sem cotação';
        }
      }
    }

    // preço unitário: cotação atual, senão do mapa de preços, senão PM (de qualquer posição)
    const precoUnit = (held && p.preco_atual != null ? Number(p.preco_atual) : null)
      ?? (precoDe[u.ticker] > 0 ? precoDe[u.ticker] : null)
      ?? (pmDe[u.ticker] > 0 ? pmDe[u.ticker] : null);
    const inteiro = GRUPOS.includes(u.classe); // ações/BDRs/FIIs = cotas inteiras
    const rs = Math.abs(sugestaoRs);
    let qtd = null, umaCotaPassa = false;
    if (precoUnit > 0 && (acao === 'comprar' || acao === 'reduzir')) {
      if (inteiro) {
        qtd = Math.floor(rs / precoUnit);
        umaCotaPassa = qtd < 1 && precoUnit > rs;
      } else {
        qtd = rs / precoUnit; // cripto: fracionário
      }
    }

    itens.push({ ...u, held, pesoReal, gap, sugestaoRs, desconto: d, acao, tom, motivo, forca, nova, atencao, p, precoUnit, qtd, inteiro, umaCotaPassa });
  }

  // novas primeiro, depois as "limpas", depois as de atenção; alfabético dentro de cada grupo
  // se nem 1 cota cabe no ajuste, não conta como compra
  const comprar = itens.filter((i) => i.acao === 'comprar' && !i.umaCotaPassa)
    .sort((a, b) => (b.nova - a.nova) || (a.atencao - b.atencao) || a.ticker.localeCompare(b.ticker));
  const reduzir = itens.filter((i) => i.acao === 'reduzir')
    .sort((a, b) => (a.atencao - b.atencao) || a.ticker.localeCompare(b.ticker));
  const manter = itens.filter((i) => i.acao === 'manter');
  const novasN = comprar.filter((i) => i.nova).length;

  const Linha = ({ i }) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px',
      borderBottom: '1px solid var(--line-soft)',
      borderLeft: i.nova ? '3px solid var(--up)' : i.atencao ? '3px solid var(--amber)' : '3px solid transparent',
      background: i.nova ? 'var(--up-bg)' : 'transparent',
    }}>
      <div style={{
        width: 30, height: 30, borderRadius: 8, flex: 'none', display: 'grid', placeItems: 'center',
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
        background: i.tom === 'buy' ? 'var(--up-bg)' : i.tom === 'sell' ? 'var(--down-bg)' : '#EFF1EC',
        color: i.tom === 'buy' ? 'var(--up)' : i.tom === 'sell' ? 'var(--down)' : 'var(--ink-faint)',
      }}>{i.tom === 'buy' ? 'C' : i.tom === 'sell' ? 'V' : '–'}</div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <b style={{ fontFamily: 'var(--font-display)', fontSize: 14 }}>{i.ticker}</b>
          {i.nova && (
            <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.04em', color: '#fff', background: 'var(--up)', borderRadius: 4, padding: '1px 6px' }}>NOVA</span>
          )}
          <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>{i.classe}</span>
        </div>
        <div style={{ fontSize: 12, marginTop: 2, color: i.atencao ? 'var(--amber)' : 'var(--ink-soft)' }}>
          {i.atencao ? '⚠ ' : ''}{i.motivo}
        </div>
        {i.held && i.p && (
          <div style={{ fontSize: 11.5, marginTop: 3, color: 'var(--ink-faint)', fontFamily: 'var(--font-display)' }}>
            PM {brl(Number(i.p.preco_medio))}
            {i.p.preco_atual != null && (
              <>
                {' · agora '}{brl(Number(i.p.preco_atual))}
                {i.desconto != null && (
                  <b style={{ color: i.desconto <= 0 ? 'var(--up)' : 'var(--down)', marginLeft: 4 }}>
                    ({i.desconto > 0 ? '+' : ''}{pct(i.desconto)})
                  </b>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, color: i.tom === 'buy' ? 'var(--up)' : 'var(--down)' }}>
          {i.sugestaoRs >= 0 ? 'comprar ' : 'reduzir '}{brl(Math.abs(i.sugestaoRs))}
        </div>
        {(i.acao === 'comprar' || i.acao === 'reduzir') && (
          i.precoUnit > 0 ? (
            <div style={{ fontSize: 11, marginTop: 2, color: i.umaCotaPassa ? 'var(--amber)' : 'var(--ink-faint)' }}>
              {i.umaCotaPassa
                ? `1 cota = ${brl(i.precoUnit)} (acima do ajuste)`
                : i.inteiro
                  ? `≈ ${i.qtd} cota${i.qtd === 1 ? '' : 's'} a ${brl(i.precoUnit)}`
                  : `≈ ${i.qtd.toLocaleString('pt-BR', { maximumFractionDigits: 6 })} un.`}
            </div>
          ) : (
            <div style={{ fontSize: 11, marginTop: 2, color: 'var(--ink-faint)' }}>sem cotação p/ calcular cotas</div>
          )
        )}
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2 }}>
          {pct(i.pesoReal)} de {pct(i.target)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Recomendações</b><span>o que comprar e reduzir</span></div>
        </div>
        <a href="/carteira" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>carteira →</a>
      </header>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2>Comprar ({comprar.length})</h2>
          {novasN > 0 && <span style={{ fontSize: 12, color: 'var(--up)', fontWeight: 600 }}>{novasN} {novasN === 1 ? 'nova' : 'novas'}</span>}
        </div>
        <div style={{ marginTop: 6 }}>
          {comprar.map((i) => <Linha key={i.ticker} i={i} />)}
          {comprar.length === 0 && <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>Nada abaixo do alvo agora.</div>}
        </div>
      </section>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="card-h"><h2>Reduzir ({reduzir.length})</h2></div>
        <div style={{ marginTop: 6 }}>
          {reduzir.map((i) => <Linha key={i.ticker} i={i} />)}
          {reduzir.length === 0 && <div style={{ padding: '14px 20px', fontSize: 13, color: 'var(--ink-faint)' }}>Nenhum ativo acima do alvo.</div>}
        </div>
      </section>

      <p style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center', margin: '4px 0 18px' }}>
        {manter.length} ativos no alvo. ⚠ = fora da condição de preço (comprar acima do PM ou vender abaixo) — aparece como aviso. Tolerância {(TOL * 100).toFixed(0)}%.
      </p>
    </div>
  );
}
