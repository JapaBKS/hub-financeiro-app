'use client';
import { useState } from 'react';
import { brl, numeroBR } from '../../lib/format';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const mesLabel = (i) => `${MESES[i % 12]}/${Math.floor(i / 12)}`;

// "Quero R$ X por mês": quanto precisa ter, quando chega lá pela projeção da Meta e
// quanto vender no começo de cada ano (o que os proventos não cobrem).
export default function SimularRenda({ pontos, hojeIdx, temHoje, proventosMes }) {
  const [texto, setTexto] = useState('5.000');
  const [taxa, setTaxa] = useState(0.04);
  // "5.000" é cinco mil (ponto de milhar), não 5
  const limpo = String(texto).trim();
  const renda = (/^\d{1,3}(\.\d{3})+$/.test(limpo) ? Number(limpo.replace(/\./g, '')) : numeroBR(limpo)) || 0;

  const precisa = (renda * 12) / taxa;
  const quando = pontos.find(([, v]) => v >= precisa);
  const jaTem = temHoje >= precisa;
  const anos = quando ? Math.floor((quando[0] - hojeIdx) / 12) : null;
  const meses = quando ? (quando[0] - hojeIdx) % 12 : null;

  const provMes = Math.min(renda, precisa * proventosMes);
  const vendaAno = (renda - provMes) * 12;

  return (
    <div className="sim-renda">
      <div className="sim-entrada">
        <label>
          <span>Quero por mês</span>
          <input className="campo" inputMode="decimal" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </label>
        <div className="sim-taxa" role="group" aria-label="Taxa de retirada">
          <button type="button" className="chip" aria-pressed={taxa === 0.04} onClick={() => setTaxa(0.04)}>4%</button>
          <button type="button" className="chip" aria-pressed={taxa === 0.035} onClick={() => setTaxa(0.035)}>3,5% (mais seguro)</button>
        </div>
      </div>

      {renda > 0 && (
        <dl className="sim-saida">
          <div><dt>Precisa ter investido</dt><dd>{brl(precisa)}</dd></div>
          <div>
            <dt>Quando, pela projeção</dt>
            <dd>{jaTem ? 'você já tem' : quando ? <>{mesLabel(quando[0])} <small>(~{anos}a {meses}m)</small></> : 'depois de 2100'}</dd>
          </div>
          <div><dt>Proventos esperados</dt><dd>{brl(provMes)}<small>/mês</small></dd></div>
          <div className="sim-destaque"><dt>Vender no início de cada ano</dt><dd>{brl(vendaAno)}</dd></div>
        </dl>
      )}
      <p className="ir-nota" style={{ margin: '8px 0 0' }}>
        Tudo em dinheiro de hoje: a cada ano, corrija a retirada e a venda pela inflação. Vendendo no início do ano,
        o dinheiro fica no Tesouro Selic ou CDB de liquidez diária e você tira o mês a mês dele.
        Com 4% o dinheiro durou 30 anos em quase todos os cenários do Trinity Study; para mais tempo, use 3,5%.
      </p>
    </div>
  );
}
