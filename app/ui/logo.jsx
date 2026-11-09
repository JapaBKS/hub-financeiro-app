// Logo do Hub Financeiro: moeda ocre com rosácea (como a impressão de uma cédula) e o "H",
// sobre o quadrado petróleo. Mesmo desenho dos ícones do app em public/icones.

function rosacea(R, r, d, voltas, passos, escala) {
  let p = '';
  for (let i = 0; i <= passos; i++) {
    const t = (i / passos) * Math.PI * 2 * voltas;
    const x = ((R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t)) * escala;
    const y = ((R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t)) * escala;
    p += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return p;
}
// escala 0,76: a rosácea fica inteira dentro da moeda (antes vazava e fazia um anel escuro em volta)
const TRACO = rosacea(100, 27, 46, 27, 900, 0.76);

// fundo=false: só a moeda (no menu, que já é petróleo, o quadrado aparecia como uma sombra)
export default function Logo({ tamanho = 30, className = 'marca', style, fundo = true }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="-128 -128 256 256" aria-hidden="true" className={className} style={style}>
      {fundo && <rect x="-128" y="-128" width="256" height="256" rx="56" fill="#0F3B4C" />}
      <circle r={fundo ? 92 : 124} fill="#B8752A" />
      {/* em tamanho pequeno a rosácea vira só textura; acima de 40px aparece o desenho */}
      <path d={TRACO} transform={fundo ? undefined : 'scale(1.3)'} fill="none" stroke="#fff" strokeOpacity={tamanho >= 40 ? 0.28 : 0.18} strokeWidth="1.1" />
      <circle r={fundo ? 58 : 78} fill="#B8752A" />
      <path d="M-26 -36V36M26 -36V36M-26 0H26" transform={fundo ? undefined : 'scale(1.3)'} stroke="#fff" strokeWidth="15" strokeLinecap="round" fill="none" />
    </svg>
  );
}
