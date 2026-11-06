import { brl, pct } from '../lib/format';

// Top altas e top baixas do dia entre os ativos da carteira.
// A variação vem da cotação atual contra o fechamento anterior (cripto: últimas 24h).
function Lista({ titulo, itens, cor, vazio }) {
  const maior = Math.max(...itens.map((i) => Math.abs(i.pct)), 0.0001);
  return (
    <div className="vd-col">
      <div className="vd-titulo" style={{ color: cor }}>{titulo}</div>
      {itens.length === 0 && <div className="vd-vazio">{vazio}</div>}
      {itens.map((i) => (
        <div key={i.ticker} className="vd-linha">
          <div className="vd-tk">
            <b>{i.ticker}</b>
            <span>{brl(i.preco)}</span>
          </div>
          <div className="vd-barra" aria-hidden="true"><i style={{ width: `${(Math.abs(i.pct) / maior) * 100}%`, background: cor }} /></div>
          <div className="vd-num">
            <b style={{ color: cor }}>{i.pct >= 0 ? '+' : '−'}{pct(Math.abs(i.pct), 2)}</b>
            <span>{i.rs >= 0 ? '+' : '−'}{brl(Math.abs(i.rs))}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function VariacaoDia({ movimentos, rotulo, quantos = 5 }) {
  if (!movimentos.length) return null;
  const altas = movimentos.filter((m) => m.pct > 0).sort((a, b) => b.pct - a.pct).slice(0, quantos);
  const baixas = movimentos.filter((m) => m.pct < 0).sort((a, b) => a.pct - b.pct).slice(0, quantos);
  return (
    <section className="card" style={{ marginBottom: 18 }}>
      <div className="card-h">
        <h2>Variação do dia</h2>
        <span className="sub">{rotulo}</span>
      </div>
      <div className="vd-grade">
        <Lista titulo="Maiores altas" itens={altas} cor="var(--up)" vazio="Nenhum ativo subiu." />
        <Lista titulo="Maiores baixas" itens={baixas} cor="var(--down)" vazio="Nenhum ativo caiu." />
      </div>
    </section>
  );
}
