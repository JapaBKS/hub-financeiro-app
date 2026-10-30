'use client';
import { useState } from 'react';
import { Campo } from '../ui/campos';
import { brl } from '../../lib/format';

const PCT = 0.30; // regra: de tudo que entra, 30% é separado para investir
const num = (v) => Number(String(v).replace(',', '.')) || 0;

// Calculadora da regra dos 30%: nada é salvo. Do que entrou, separa 30%, desconta as contas do
// mês e mostra a sobra — com uma sugestão de quanto mandar para a reserva, se ainda faltar.
export default function CalculadoraAporte({ reservaFalta = 0, faturasDia15 = [], faturasDia30 = [], diaInicial = 15 }) {
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

  const x = num(valor);
  const separar = x * PCT;
  const contas = num(fatura) + num(fluxo);
  const sobra = x - separar - contas;
  const paraReserva = Math.max(0, Math.min(sobra, reservaFalta));

  return (
    <section className="card" style={{ marginBottom: 16, padding: '4px 0 16px' }}>
      <div className="card-h" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Regra dos 30%</h2>
        <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>do que entrar, separe 30%</span>
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
        </div>

        <p style={{ fontSize: 11, color: 'var(--ink-faint)', margin: '6px 0 0' }}>
          {faturas.length > 0
            ? <>Faturas em aberto: {faturas.map((f) => `${f.nome} ${brl(f.valor)}`).join(' · ')}.</>
            : 'Nenhuma fatura em aberto para este salário.'}
          {' '}{dia === 15 ? 'Cobre Rico, Nubank e Mercado Pago do mês.' : 'Cobre o Inter (vence dia 1).'}
        </p>

        <div className="calc30">
          <div className="calc30-bloco calc30-sep">
            <span>Separar para investir (30%)</span>
            <b>{brl(separar)}</b>
          </div>
          <div className="calc30-bloco">
            <span>Contas do mês</span>
            <b>{brl(contas)}</b>
          </div>
        </div>

        <div className="calc30-bloco" style={{ marginTop: 10 }}>
          <span>Sobra</span>
          <b style={{ color: sobra < 0 ? 'var(--down)' : undefined }}>{sobra < 0 ? '−' : ''}{brl(Math.abs(sobra))}</b>
        </div>

        {x > 0 && sobra > 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--ink-soft)', margin: '10px 0 0' }}>
            {reservaFalta > 0
              ? <>Sugestão: mandar <b>{brl(paraReserva)}</b> da sobra para a reserva (faltam {brl(reservaFalta)} para o alvo).{sobra > paraReserva ? <> O restante, {brl(sobra - paraReserva)}, fica livre.</> : null}</>
              : <>A reserva já está no alvo: a sobra fica livre para investir mais ou guardar.</>}
          </p>
        )}
        {x > 0 && sobra < 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--down)', margin: '10px 0 0' }}>
            Os 30% e as contas passam do que você recebeu em {brl(-sobra)}.
          </p>
        )}
      </div>
    </section>
  );
}
