import { distribuirAporte } from './aporte';
import { brl } from '../format';

// Monta as listas de Comprar / Reduzir da tela Investir a partir dos itens já avaliados
// (ação, buraco em sugestaoRs, preço, cota inteira) e do saldo disponível para investir.
// Puro: não altera os itens recebidos. Roda no navegador, para o passo 3 acompanhar o passo 2.
//  - o saldo é repartido pelo tamanho do buraco (distribuirAporte), incluindo a reserva
//    de emergência como mais um destino até o alvo dela;
//  - sem saldo, cada linha mostra o buraco inteiro.
export function montarCompras(itensBase, municao, reserva) {
  const itens = itensBase.map((i) => ({ ...i }));
  let reservaAporte = 0;
  let sobra = 0; // troco das cotas inteiras que a reserva não absorveu

  if (municao > 0) {
    const compraveis = itens.filter((i) => i.acao === 'comprar' && i.sugestaoRs > 0);
    const entradas = compraveis.map((i) => ({ ticker: i.ticker, buraco: i.sugestaoRs, preco: i.precoUnit, inteiro: i.inteiro }));
    // a reserva não tem cota: é valor livre (inteiro = false, sem preço)
    if (reserva && reserva.falta > 0) entradas.push({ ticker: reserva.nome, buraco: reserva.falta, preco: 0, inteiro: false });
    const fatias = distribuirAporte(entradas, municao);
    reservaAporte = reserva ? fatias[reserva.nome] || 0 : 0;
    for (const i of compraveis) {
      i.buraco = i.sugestaoRs;
      i.sugestaoRs = fatias[i.ticker] || 0;
      if (i.precoUnit > 0) {
        if (i.inteiro) {
          i.qtd = Math.floor(i.sugestaoRs / i.precoUnit);
          i.umaCotaPassa = i.qtd < 1 && i.precoUnit > i.sugestaoRs;
          // compra o que cabe em cotas inteiras; o troco vai para a reserva (abaixo)
          const gasto = Math.round(i.qtd * i.precoUnit * 100) / 100;
          sobra += i.sugestaoRs - gasto;
          i.sugestaoRs = gasto;
        } else {
          i.qtd = i.sugestaoRs / i.precoUnit;
          i.umaCotaPassa = false;
        }
      }
    }
  }

  // troco das cotas inteiras: completa a reserva enquanto ela estiver abaixo do alvo;
  // o que passar disso fica para o mês seguinte
  if (sobra > 0.005 && reserva && reserva.falta > reservaAporte) {
    const extra = Math.min(sobra, reserva.falta - reservaAporte);
    reservaAporte += extra;
    sobra -= extra;
  }
  sobra = Math.round(Math.max(0, sobra) * 100) / 100;

  // novas primeiro, depois clean vs atenção; dentro de cada grupo, MAIOR valor no topo
  // se nem 1 cota cabe no ajuste, não conta como compra
  const comprar = itens.filter((i) => i.acao === 'comprar' && !i.umaCotaPassa)
    .sort((a, b) => (b.nova - a.nova) || (a.atencao - b.atencao) || (Math.abs(b.sugestaoRs) - Math.abs(a.sugestaoRs)));
  const reduzir = itens.filter((i) => i.acao === 'reduzir')
    .sort((a, b) => (a.atencao - b.atencao) || (Math.abs(b.sugestaoRs) - Math.abs(a.sugestaoRs)));
  // a reserva não é um ativo negociável: entra como linha própria, sem cotas
  if (reservaAporte > 0) {
    comprar.push({
      ticker: reserva.nome, classe: reserva.nome, reserva: true,
      acao: 'comprar', tom: 'buy', motivo: `abaixo do alvo · reserva de ${brl(reserva.alvo)}`,
      nova: false, atencao: false, held: false,
      sugestaoRs: reservaAporte, buraco: reserva.falta,
      saldo: reserva.saldo, alvoRs: reserva.alvo,
      precoUnit: 0, qtd: null, inteiro: false, umaCotaPassa: false,
    });
  }
  return { comprar, reduzir, reservaAporte, sobra, novasN: comprar.filter((i) => i.nova).length };
}
