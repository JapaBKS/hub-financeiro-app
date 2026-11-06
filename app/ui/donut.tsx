// ============================================================================
// app/ui/donut.tsx — desenho de rosca
//
// `arcPath` e a paleta estavam duplicados byte a byte em Faturas e Caixa.
// Duplicata idêntica hoje é duplicata divergente amanhã: foi o que aconteceu
// com o formatador de moeda desses mesmos arquivos (um tratava valor vazio,
// o outro não, e virava "R$ NaN" numa das telas).
// ============================================================================

// paleta categórica alinhada à identidade (petróleo, ocre…), distinguível também no escuro
export const CORES = [
  '#1D6378', '#C98A3A', '#5FA39A', '#4C6FA8', '#B5574B',
  '#8E9A45', '#7D5A9C', '#D2B06A', '#2F8C7E', '#6E8794', '#9AA3A8',
];

/** Caminho SVG de um anel entre dois ângulos (R = raio externo, r = interno). */
export function arcPath(a0: number, a1: number, cx: number, cy: number, R: number, r: number): string {
  const p = (a: number, rad: number): [number, number] => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
  const grande = a1 - a0 > Math.PI ? 1 : 0;
  const [x0, y0] = p(a0, R), [x1, y1] = p(a1, R);
  const [x2, y2] = p(a1, r), [x3, y3] = p(a0, r);
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${grande} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} `
       + `L ${x2.toFixed(2)} ${y2.toFixed(2)} A ${r} ${r} 0 ${grande} 0 ${x3.toFixed(2)} ${y3.toFixed(2)} Z`;
}

export interface ItemFatia { cat: string; val: number }
export interface Fatia extends ItemFatia {
  frac: number; a0: number; a1: number; color: string; cheio: boolean;
}

/**
 * Converte [{cat, val}] em fatias com ângulos e cor.
 * Descarta valor zerado — categoria sem valor poluía a legenda com "0%"
 * (acontecia nas compras 100% do outro pagador).
 */
export function fatiar(itens: ItemFatia[], minimo = 0.005): Fatia[] {
  const validos = itens.filter((i) => i.val > minimo).sort((a, b) => b.val - a.val);
  const total = validos.reduce((s, i) => s + i.val, 0);
  if (total <= 0) return [];

  let ang = -Math.PI / 2;   // começa no topo
  return validos.map((i, idx) => {
    const frac = i.val / total;
    const a0 = ang;
    const a1 = ang + frac * 2 * Math.PI;
    ang = a1;
    return { ...i, frac, a0, a1, color: CORES[idx % CORES.length], cheio: frac >= 0.999 };
  });
}
