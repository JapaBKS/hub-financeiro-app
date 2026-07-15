'use client';
import { useEffect, useRef, useState } from 'react';

// Conta de 0 até `valor` com uma suavizada (easeOutCubic) ao montar.
// Respeita "reduzir movimento" do sistema. Reutilizável em qualquer número.
export default function NumeroAnimado({ valor, duracao = 900, minimumFractionDigits = 2, maximumFractionDigits = 2 }) {
  const [n, setN] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const alvo = Number(valor) || 0;
    const reduz = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduz) { setN(alvo); return; }

    let inicio = null;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const passo = (ts) => {
      if (inicio == null) inicio = ts;
      const p = Math.min((ts - inicio) / duracao, 1);
      setN(alvo * ease(p));
      if (p < 1) raf.current = requestAnimationFrame(passo);
      else setN(alvo);
    };
    raf.current = requestAnimationFrame(passo);
    return () => raf.current && cancelAnimationFrame(raf.current);
  }, [valor, duracao]);

  return <>{n.toLocaleString('pt-BR', { minimumFractionDigits, maximumFractionDigits })}</>;
}
