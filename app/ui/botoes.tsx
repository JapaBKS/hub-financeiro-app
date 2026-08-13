// ============================================================================
// app/ui/botoes.tsx — botões
//
// As variantes têm SIGNIFICADO, não só cor: "primario" é a ação principal da
// tela, "perigo" é destrutiva. Nomear pela intenção (e não por "botão verde")
// evita que a aparência e o significado se descolem com o tempo.
// ============================================================================
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type Variante = 'primario' | 'secundario' | 'sutil' | 'perigo';
export type Tamanho = 'sm' | 'md' | 'lg';

const cx = (...partes: (string | false | null | undefined)[]) => partes.filter(Boolean).join(' ');

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
  /** ocupa toda a largura disponível */
  cheio?: boolean;
  /** mostra "…" e bloqueia cliques enquanto salva */
  carregando?: boolean;
  children: ReactNode;
}

export function Botao({
  variante = 'secundario',
  tamanho = 'md',
  cheio,
  carregando,
  disabled,
  className,
  children,
  ...resto
}: BotaoProps) {
  return (
    <button
      className={cx('btn', `btn-${variante}`, tamanho !== 'md' && `btn-${tamanho}`, cheio && 'btn-cheio', className)}
      disabled={disabled || carregando}
      {...resto}
    >
      {carregando ? '…' : children}
    </button>
  );
}
