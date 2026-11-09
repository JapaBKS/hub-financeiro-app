// Classes "em transição": dinheiro que já tem destino marcado para mudar (ex.: renda fixa
// que vence em 01/01/2027 e vai virar reserva ou aporte). Ficam fora dos % da carteira,
// do "Disponível para investir" e da composição, até o dinheiro ser realocado.
export const CLASSES_EM_TRANSICAO = ['Renda Fixa Vencendo'];
export const emTransicao = (nome) => CLASSES_EM_TRANSICAO.includes(nome);
