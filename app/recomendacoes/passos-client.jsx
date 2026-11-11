'use client';
import { useState, useMemo } from 'react';
import CalculadoraAporte from '../meta/calculadora-aporte';
import AInvestir from './a-investir-client';
import RecomendacoesLista from './lista-client';
import { montarCompras } from '../../lib/dominio/montar-compras';

// Os 3 passos ligados: o total do passo 1 preenche o saldo do passo 2, e o passo 3 refaz a
// divisão com o que está no passo 2, na hora (salvar só grava o saldo para a próxima visita).
export default function PassosInvestir({ faturasSal, saldos, itens, municao, reserva, manterN, tol, assets, classes }) {
  const [investir, setInvestir] = useState(0);
  const salvo = saldos.reduce((t, s) => t + Number(s.amount || 0), 0);
  const [digitado, setDigitado] = useState(salvo);
  // munição = outras classes fora do rateio (que não são editadas aqui) + o que está no passo 2
  const disponivel = Math.max(0, municao - salvo + digitado);
  const { comprar, reduzir, reservaAporte, sobra, novasN } = useMemo(() => montarCompras(itens, disponivel, reserva), [itens, disponivel, reserva]);

  return (
    <>
      <div className="inv-passo"><span>1</span>Do salário</div>
      <CalculadoraAporte onInvestir={setInvestir} faturasDia15={faturasSal.faturasDia15} faturasDia30={faturasSal.faturasDia30} diaInicial={faturasSal.diaInicial} />

      <div className="inv-passo"><span>2</span>Quanto tenho para investir</div>
      <section className="card" style={{ padding: '14px 20px 16px', marginBottom: 16 }}>
        <AInvestir saldos={saldos} somar={investir} onTotal={setDigitado} />
        <p className="ir-nota" style={{ margin: '8px 0 0' }}>O total do passo 1 já preenche o saldo, e a divisão abaixo acompanha na hora. Salve para o app lembrar do saldo.</p>
      </section>

      <div className="inv-passo"><span>3</span>O que comprar</div>
      <RecomendacoesLista
        comprar={comprar}
        reduzir={reduzir}
        manterN={manterN}
        novasN={novasN}
        municao={disponivel}
        reservaAporte={reservaAporte}
        sobra={sobra}
        tol={tol}
        assets={assets}
        classes={classes}
      />
    </>
  );
}
