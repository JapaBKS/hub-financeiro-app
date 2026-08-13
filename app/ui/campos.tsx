// ============================================================================
// app/ui/campos.tsx — campos de formulário
//
// Antes: 20 arquivos declaravam o próprio objeto `inp`, com 10 variações de
// padding/borda. Mudar a aparência de um campo exigia editar 20 arquivos —
// e as versões já tinham divergido (algumas sem `color`, o que quebrava o
// modo escuro).
//
// Agora o visual mora no CSS (.campo) e o componente só aplica a classe.
// Estilo em CSS em vez de objeto inline permite :focus, :hover e media
// queries — coisas que estilo inline não alcança.
// ============================================================================
import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

type Tamanho = 'sm' | 'md';

/** junta classes ignorando vazios — evita `className="campo  undefined"` */
const cx = (...partes: (string | false | null | undefined)[]) => partes.filter(Boolean).join(' ');

interface CampoProps extends InputHTMLAttributes<HTMLInputElement> {
  tamanho?: Tamanho;
  /** alinha à direita — use em valores e quantidades */
  numerico?: boolean;
  largura?: number | string;
}

export function Campo({ tamanho = 'md', numerico, largura, className, style, ...resto }: CampoProps) {
  return (
    <input
      className={cx('campo', tamanho === 'sm' && 'campo-sm', numerico && 'campo-num', className)}
      style={largura ? { width: largura, ...style } : style}
      {...resto}
    />
  );
}

interface SelecaoProps extends SelectHTMLAttributes<HTMLSelectElement> {
  tamanho?: Tamanho;
  largura?: number | string;
  children: ReactNode;
}

export function Selecao({ tamanho = 'md', largura, className, style, children, ...resto }: SelecaoProps) {
  return (
    <select
      className={cx('campo', tamanho === 'sm' && 'campo-sm', className)}
      style={largura ? { width: largura, ...style } : style}
      {...resto}
    >
      {children}
    </select>
  );
}

interface AreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** para colar extratos: fonte monoespaçada e altura maior */
  colagem?: boolean;
}

export function AreaTexto({ colagem, className, ...resto }: AreaProps) {
  return <textarea className={cx('campo', 'campo-area', colagem && 'campo-colagem', className)} {...resto} />;
}

interface RotuloProps {
  texto: string;
  children: ReactNode;
  dica?: string;
}

/** Campo com rótulo acima — acessível: o clique no texto foca o campo. */
export function ComRotulo({ texto, children, dica }: RotuloProps) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{texto}</span>
      {children}
      {dica && <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>{dica}</span>}
    </label>
  );
}
