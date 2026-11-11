'use client';
import { useState } from 'react';
import CalculadoraAporte from '../meta/calculadora-aporte';
import AInvestir from './a-investir-client';

// Passos 1 e 2 juntos: o "vou investir" do passo 1 já entra no saldo A investir do passo 2.
export default function PassosInvestir({ faturasSal, saldos }) {
  const [investir, setInvestir] = useState(0);
  return (
    <>
      <div className="inv-passo"><span>1</span>Do salário</div>
      <CalculadoraAporte onInvestir={setInvestir} faturasDia15={faturasSal.faturasDia15} faturasDia30={faturasSal.faturasDia30} diaInicial={faturasSal.diaInicial} />

      <div className="inv-passo"><span>2</span>Quanto tenho para investir</div>
      <section className="card" style={{ padding: '14px 20px 16px', marginBottom: 16 }}>
        <AInvestir saldos={saldos} somar={investir} />
        <p className="ir-nota" style={{ margin: '8px 0 0' }}>O total do passo 1 já preenche o saldo. Confira e salve depois de transferir para a corretora; a divisão abaixo usa esse valor.</p>
      </section>
    </>
  );
}
