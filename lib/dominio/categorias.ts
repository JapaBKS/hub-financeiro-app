// ============================================================================
// lib/dominio/categorias.ts
// A lista estava copiada em 3 arquivos: adicionar uma categoria em um deles
// deixava os outros dessincronizados, sem erro nenhum aparecer.
// ============================================================================
export const CATEGORIAS = [
  'Comida', 'Mercado', 'Lazer', 'Transporte', 'Saúde',
  'Casa', 'Assinaturas', 'Roupas', 'Educação', 'Presentes', 'Outros',
] as const;

export type Categoria = (typeof CATEGORIAS)[number];

export const SEM_CATEGORIA = 'Sem categoria';
