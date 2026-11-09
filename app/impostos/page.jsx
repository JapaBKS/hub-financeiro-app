import Apuracao from './apuracao';
import Declaracao from './declaracao';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Impostos: as duas visões das mesmas vendas.
//   Mês a mês (DARF) — resultado de cada mês, imposto e se foi pago
//   Declaração anual — o que copiar para o programa da Receita
export default function Impostos({ searchParams }) {
  const aba = searchParams?.aba === 'anual' ? 'anual' : 'mensal';
  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <header className="topbar">
        <div className="brand">
          <div><b>Impostos</b><span>{aba === 'anual' ? 'o que vai na declaração' : 'resultado das vendas e DARF'}</span></div>
        </div>
      </header>
      <nav className="ir-anos" aria-label="Visão">
        <a href="/impostos" className="chip chip-grande" aria-pressed={aba === 'mensal'}>Mês a mês (DARF)</a>
        <a href="/impostos?aba=anual" className="chip chip-grande" aria-pressed={aba === 'anual'}>Declaração anual</a>
      </nav>
      {aba === 'anual' ? <Declaracao searchParams={searchParams} /> : <Apuracao />}
    </div>
  );
}
