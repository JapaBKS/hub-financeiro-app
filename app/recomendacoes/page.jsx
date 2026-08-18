import { supabaseServer } from '../../lib/supabase';
import { brl, brlShort, pct } from '../../lib/format';
import { criarResolvedorDePreco } from '../../lib/dominio/precos';
import RecomendacoesLista from './lista-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// tolerância: aceita até X% do lado "errado" do PM antes de virar aviso
const TOL = 0.03;

export default async function Recomendacoes() {
  const sb = supabaseServer();
  const [{ data: pos }, { data: alvoAssets }, { data: alloc }, { data: classes }, { data: precos }, { data: listaAssets }, { data: listaClasses }, { data: manuais }, { data: congelados }] = await Promise.all([
    sb.from('v_positions').select('*'),
    sb.from('assets').select('ticker, target_pct, asset_classes(name, target_pct)').gt('target_pct', 0),
    sb.from('v_class_allocation').select('valor'),
    sb.from('asset_classes').select('name, target_pct, alvo_valor, fora_rateio'),
    sb.from('prices').select('ticker, price, updated_at'),
    sb.from('assets').select('ticker').order('ticker'),
    sb.from('asset_classes').select('id, name').order('name'),
    sb.from('manual_prices').select('ticker, price'),
    sb.from('assets').select('ticker, congelado'),
  ]);

  const precoDe = criarResolvedorDePreco(precos, manuais);
  const pmDe = {};
  (pos || []).forEach((p) => { if (Number(p.preco_medio) > 0) pmDe[p.ticker] = Number(p.preco_medio); });
  const congeladoDe = {};
  (congelados || []).forEach((a) => { congeladoDe[a.ticker] = !!a.congelado; });

  // uma classe é "grupo" (pesos por ativo) quando tem ao menos um ativo com peso
  // definido — assim novas abas funcionam sozinhas, sem lista fixa no código
  const classesComPesos = new Set((alvoAssets || []).map((a) => a.asset_classes?.name).filter(Boolean));
  // classe é fracionável se alguma posição dela tem quantidade quebrada (cripto);
  // o resto (B3) negocia em cotas inteiras
  const classesFracionadas = new Set();
  (pos || []).forEach((p) => {
    if (p.classe && Number(p.quantidade) % 1 !== 0) classesFracionadas.add(p.classe);
  });
  const metaClasse = {};
  (classes || []).forEach((c) => { metaClasse[c.name] = Number(c.target_pct) || 0; });

  // classes com alvo em R$ (ex.: reserva) ficam FORA do rateio de % e das sugestões
  const classesValorFixo = new Set(
    (classes || [])
      .filter((c) => (c.alvo_valor != null && Number(c.alvo_valor) > 0) || c.fora_rateio)
      .map((c) => c.name),
  );

  // os 100% se distribuem só sobre o que é investimento rebalanceável
  const totalDaView = (alloc || [])
    .filter((c) => !classesValorFixo.has(c.classe))
    .reduce((s, c) => s + Number(c.valor), 0);

  const posMap = {};
  (pos || []).forEach((p) => {
    // Antes exigia `preco_atual != null`: um ativo que você TEM mas que está sem
    // cotação automática ficava de fora e aparecia como "nova posição".
    // O preço agora vem do resolvedor (cotação, manual ou PM), então basta ter posição.
    if (!classesValorFixo.has(p.classe)) posMap[p.ticker] = p;
  });

  // A view calcula o valor com a cotação da tabela `prices`. Quando vale o preço
  // manual, esse valor fica defasado — e aí o peso usaria um preço enquanto a
  // quantidade a negociar usaria outro (era o que mandava vender mais cotas do
  // que se tem). Reavaliamos aqui com o mesmo preço que será usado na sugestão.
  const valorDe = {};
  let ajuste = 0;
  for (const p of Object.values(posMap)) {
    const preco = precoDe(p.ticker, Number(p.preco_medio) || 0).preco;
    const reavaliado = (Number(p.quantidade) || 0) * preco;
    valorDe[p.ticker] = reavaliado;
    ajuste += reavaliado - (Number(p.valor_carteira) || 0);
  }
  const total = (totalDaView + ajuste) || 1;

  const universo = new Map();
  (alvoAssets || []).forEach((a) => universo.set(a.ticker, {
    ticker: a.ticker,
    target: Number(a.target_pct) * Number(a.asset_classes?.target_pct || 0),
    classe: a.asset_classes?.name,
    congelado: congeladoDe[a.ticker] || false,
  }));
  Object.values(posMap).forEach((p) => {
    if (!universo.has(p.ticker)) {
      // classe de ativo único (ex.: BTC): o ativo é 100% da classe -> alvo = meta da classe.
      // classe com grupo (Ações/BDRs/FIIs) sem peso cadastrado -> fora da lista (alvo 0).
      const target = classesComPesos.has(p.classe) ? 0 : (metaClasse[p.classe] || 0);
      universo.set(p.ticker, { ticker: p.ticker, target, classe: p.classe, congelado: congeladoDe[p.ticker] || false });
    }
  });

  const itens = [];
  for (const u of universo.values()) {
    const p = posMap[u.ticker];
    const held = !!p;
    const pesoReal = held ? (valorDe[u.ticker] ?? Number(p.valor_carteira)) / total : 0;
    const gap = u.target - pesoReal; // >0 = abaixo do alvo
    const sugestaoRs = gap * total;
    const resolvido = precoDe(u.ticker, pmDe[u.ticker] || 0);
    const precoUnit = resolvido.preco;
    const semCotacaoAuto = resolvido.origem === 'pm' || resolvido.origem === 'nenhum';
    const precoManual = resolvido.origem === 'manual' ? resolvido.preco : null;
    const precoVelho = resolvido.origem === 'auto-velho';

    // o desconto compara o preço QUE VAI SER USADO com o preço médio —
    // usar a cotação velha aqui contradiz o cálculo das cotas logo abaixo
    const d = held && Number(p.preco_medio) > 0 && precoUnit > 0
      ? (precoUnit - Number(p.preco_medio)) / Number(p.preco_medio)
      : null;
    const dPct = d != null ? Math.round(Math.abs(d) * 100) : null;

    let acao = 'manter', tom = 'hold', motivo = 'no alvo', forca = 0, nova = false, atencao = false;

    if (u.congelado) {
      motivo = 'congelado — fora do rebalanceamento';
    } else if (!held && u.target > 0) {
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
    const inteiro = !classesFracionadas.has(u.classe); // só cripto é fracionário
    const rs = Math.abs(sugestaoRs);
    let qtd = null, umaCotaPassa = false;
    if (precoUnit > 0 && (acao === 'comprar' || acao === 'reduzir')) {
      if (inteiro) {
        qtd = Math.floor(rs / precoUnit);
        umaCotaPassa = qtd < 1 && precoUnit > rs;
      } else {
        qtd = rs / precoUnit; // cripto: fracionário
      }
      // trava de segurança: não dá para vender mais cotas do que se tem
      if (acao === 'reduzir' && held) {
        const disponivel = Number(p.quantidade) || 0;
        if (qtd > disponivel) qtd = inteiro ? Math.floor(disponivel) : disponivel;
      }
    }

    itens.push({ ...u, held, pesoReal, gap, sugestaoRs, desconto: d, acao, tom, motivo, forca, nova, atencao, p, precoUnit, qtd, inteiro, umaCotaPassa, semCotacaoAuto, precoManual, precoVelho, origemPreco: resolvido.origem });
  }

  // novas primeiro, depois clean vs atenção; dentro de cada grupo, MAIOR valor no topo
  // se nem 1 cota cabe no ajuste, não conta como compra
  const comprar = itens.filter((i) => i.acao === 'comprar' && !i.umaCotaPassa)
    .sort((a, b) => (b.nova - a.nova) || (a.atencao - b.atencao) || (Math.abs(b.sugestaoRs) - Math.abs(a.sugestaoRs)));
  const reduzir = itens.filter((i) => i.acao === 'reduzir')
    .sort((a, b) => (a.atencao - b.atencao) || (Math.abs(b.sugestaoRs) - Math.abs(a.sugestaoRs)));
  const manter = itens.filter((i) => i.acao === 'manter');
  const novasN = comprar.filter((i) => i.nova).length;

  return (
    <div className="wrap" style={{ maxWidth: 760 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark" />
          <div><b>Recomendações</b><span>o que comprar e reduzir</span></div>
        </div>
        <a href="/carteira" style={{ fontSize: 13, color: 'var(--forest-2)', textDecoration: 'none', fontWeight: 500 }}>carteira →</a>
      </header>

      <RecomendacoesLista
        comprar={comprar}
        reduzir={reduzir}
        manterN={manter.length}
        novasN={novasN}
        tol={TOL}
        assets={listaAssets || []}
        classes={listaClasses || []}
      />
    </div>
  );
}
