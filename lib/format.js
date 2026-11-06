export const brl = (n) =>
  (n ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const brlShort = (n) =>
  'R$ ' + Math.round(n ?? 0).toLocaleString('pt-BR');

export const pct = (n, casas = 1) =>
  ((n ?? 0) * 100).toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }) + '%';

// Lê um valor digitado no padrão brasileiro ("1.234,56", "1234,5", "1234.5").
// Devolve NaN quando não é número, para a tela recusar em vez de salvar zero.
export const numeroBR = (v) => {
  const s = String(v ?? '').trim().replace(/\s|R\$/g, '');
  if (!s) return NaN;
  const normal = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s;
  return /^-?\d*\.?\d+$/.test(normal) ? Number(normal) : NaN;
};
