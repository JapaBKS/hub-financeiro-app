'use client';
import { useState, useEffect } from 'react';
import { Campo } from '../ui/campos';
import { brl } from '../../lib/format';

const PCT = 0.30; // regra: de tudo que entra, 30% é separado para investir
const num = (v) => Number(String(v).replace(',', '.')) || 0;

// Calculadora do aporte: nada é salvo. Do que entrou, desconta faturas e fluxo; o resto é o que
// vai para investir, em R$ e em % do recebido, comparado com a referência de 30%.
export default function CalculadoraAporte({ onInvestir, faturasDia15 = [], faturasDia30 = [], diaInicial = 15 }) {
  const somaF = (l) => Math.round(l.reduce((t, f) => t + f.valor, 0) * 100) / 100;
  const textoF = (l) => (somaF(l) ? String(somaF(l)) : '');
  const [dia, setDia] = useState(diaInicial);
  const [valor, setValor] = useState('');
  const [fatura, setFatura] = useState(() => textoF(diaInicial === 15 ? faturasDia15 : faturasDia30));
  const faturas = dia === 15 ? faturasDia15 : faturasDia30;
  function trocarDia(d) {
    setDia(d);
    setFatura(textoF(d === 15 ? faturasDia15 : faturasDia30)); // preenche com a sua parte; segue editável
  }
  const [fluxo, setFluxo] = useState('');
  const [corretora, setCorretora] = useState(''); // proventos e sobras parados na corretora (rendendo CDI)

  const x = num(valor);
  const contas = num(fatura) + num(fluxo);
  // o que sobra depois das contas vai todo para investir; compara com a referência dos 30%
  // a % e a comparação com os 30% contam tudo que vai para investir (salário + corretora)
  const doSalario = x - contas;
  const extra = num(corretora);
  const investir = doSalario + extra;
  const pctInvestir = x > 0 ? investir / x : 0;
  const ref = x * PCT;
  const dif = investir - ref;
  useEffect(() => { if (onInvestir) onInvestir(x > 0 || extra > 0 ? Math.max(0, Math.round(investir * 100) / 100) : 0); }, [x, extra, investir, onInvestir]);

  return (
    <section className="card" style={{ marginBottom: 16, padding: '4px 0 16px' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Quanto vou investir</h2>
      </div>
      <div style={{ padding: '4px 20px 0' }}>
        <div className="calc30-dias" role="group" aria-label="Qual salário">
          {[15, 30].map((d) => (
            <button key={d} type="button" className={dia === d ? 'calc30-dia ativo' : 'calc30-dia'} onClick={() => trocarDia(d)}>
              Salário do dia {d}
            </button>
          ))}
        </div>
        <label className="calc30-rot">Recebi (R$)</label>
        <Campo numerico largura="100%" type="number" step="any" min="0" inputMode="decimal" placeholder="0,00"
          value={valor} onChange={(e) => setValor(e.target.value)} />

        <div className="calc30-contas">
          <div>
            <label className="calc30-rot">Faturas (sua parte)</label>
            <Campo tamanho="sm" numerico largura="100%" type="number" step="any" min="0" inputMode="decimal" placeholder="0,00"
              value={fatura} onChange={(e) => setFatura(e.target.value)} />
          </div>
          <div>
            <label className="calc30-rot">Completar o fluxo</label>
            <Campo tamanho="sm" numerico largura="100%" type="number" step="any" min="0" inputMode="decimal" placeholder="0,00"
              value={fluxo} onChange={(e) => setFluxo(e.target.value)} />
          </div>
          <div>
            <label className="calc30-rot">Já na corretora</label>
            <Campo tamanho="sm" numerico largura="100%" type="number" step="any" min="0" inputMode="decimal" placeholder="0,00"
              value={corretora} onChange={(e) => setCorretora(e.target.value)} />
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: '6px 0 0' }}>
          {faturas.length > 0
            ? <>Faturas em aberto: {faturas.map((f) => `${f.nome} ${brl(f.valor)}`).join(' · ')}.</>
            : 'Nenhuma fatura em aberto para este salário.'}
          {' '}{dia === 15 ? 'Cobre Rico, Nubank e Mercado Pago do mês.' : 'Cobre o Inter (vence dia 1).'}
        </p>

        <div className="calc30">
          <div className="calc30-bloco">
            <span>Contas do mês</span>
            <b>{brl(contas)}</b>
          </div>
          <div className="calc30-bloco calc30-sep">
            <span>Vou investir</span>
            {x > 0 || extra > 0 ? (
              <b style={{ color: investir < 0 ? 'var(--down)' : undefined }}>
                {investir < 0 ? '−' : ''}{brl(Math.abs(investir))}{x > 0 && <small className="calc30-pct">{(pctInvestir * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% do recebido</small>}
              </b>
            ) : <b style={{ color: 'var(--ink-faint)' }}>—</b>}
            {extra > 0 && x > 0 && <small className="calc30-extra">{brl(doSalario)} do salário + {brl(extra)} da corretora</small>}
          </div>
        </div>

        {x > 0 && (
          <div className={`calc30-ref ${dif >= 0 ? 'acima' : 'abaixo'}`}>
            {dif >= 0 ? '▲' : '▼'} {Math.abs((pctInvestir - PCT) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} pontos ({brl(Math.abs(dif))}) {dif >= 0 ? 'acima' : 'abaixo'} dos 30%
            <span>30% seria {brl(ref)}</span>
          </div>
        )}
      </div>
    </section>
  );
}
