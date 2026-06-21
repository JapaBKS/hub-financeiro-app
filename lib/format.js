export const brl = (n) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const brlShort = (n) =>
  'R$ ' + Math.round(n ?? 0).toLocaleString('pt-BR');

export const pct = (n, casas = 1) =>
  ((n ?? 0) * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }) + '%';
