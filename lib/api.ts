// ============================================================================
// lib/api.ts — esqueleto comum das rotas
//
// Problema: 27 rotas repetiam ler corpo / validar / responder / tratar erro.
// Quatro delas sequer tinham try/catch — nelas, um erro inesperado devolve
// HTML em vez de JSON, e o `res.json()` do cliente estoura com uma mensagem
// que não ajuda ninguém.
//
// A ideia central: separar erro ESPERADO (dado inválido, culpa do cliente,
// status 4xx) de erro INESPERADO (bug ou banco fora, 5xx). O primeiro vira
// mensagem útil; o segundo é registrado no log e responde genérico — expor
// detalhe interno numa API é risco de segurança.
// ============================================================================
import { NextResponse } from 'next/server';

/** Erro previsto: a mensagem VAI para o usuário. Use para validação. */
export class ErroDeUso extends Error {
  status: number;
  constructor(mensagem: string, status = 400) {
    super(mensagem);
    this.name = 'ErroDeUso';
    this.status = status;
  }
}

export const ok = (dados: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...dados });

export const falha = (erro: string, status = 400) =>
  NextResponse.json({ ok: false, erro }, { status });

type Corpo = Record<string, unknown>;
type Manipulador = (corpo: Corpo, req: Request) => Promise<NextResponse> | NextResponse;

/**
 * Embrulha o handler: lê o corpo, captura o que vazar e padroniza a resposta.
 * Nenhuma rota volta a devolver HTML quando algo quebra.
 */
export function rota(manipulador: Manipulador) {
  return async (req: Request): Promise<NextResponse> => {
    try {
      const corpo = (await req.json().catch(() => ({}))) as Corpo;
      return await manipulador(corpo, req);
    } catch (e) {
      if (e instanceof ErroDeUso) return falha(e.message, e.status);
      // erro não previsto: registra inteiro no servidor, devolve genérico
      console.error('[api] erro inesperado:', e);
      return falha('Erro inesperado no servidor.', 500);
    }
  };
}

/**
 * Desembrulha a resposta do Supabase. Sem isto, esquecer de checar `error`
 * faz a rota responder "ok" com dado vazio — falha silenciosa, a pior espécie.
 */
export function checar<T>(resposta: { data: T; error: { message: string } | null }): T {
  if (resposta.error) throw new ErroDeUso(resposta.error.message, 500);
  return resposta.data;
}

// ---------------------------------------------------------------------------
// Validadores: lançam ErroDeUso, então a rota fica linear (sem if de erro
// a cada linha). Cada um devolve o valor já convertido para o tipo certo.
// ---------------------------------------------------------------------------

export function texto(valor: unknown, campo: string, { obrigatorio = true } = {}): string {
  const v = String(valor ?? '').trim();
  if (!v && obrigatorio) throw new ErroDeUso(`Informe ${campo}.`);
  return v;
}

export function ticker(valor: unknown, campo = 'o ticker'): string {
  return texto(valor, campo).toUpperCase();
}

export function numero(
  valor: unknown,
  campo: string,
  { min = -Infinity, max = Infinity, inteiro = false } = {},
): number {
  const n = Number(String(valor ?? '').replace(',', '.'));
  if (!Number.isFinite(n)) throw new ErroDeUso(`${campo} deve ser um número.`);
  if (inteiro && !Number.isInteger(n)) throw new ErroDeUso(`${campo} deve ser inteiro.`);
  if (n < min || n > max) throw new ErroDeUso(`${campo} deve estar entre ${min} e ${max}.`);
  return n;
}

export function id(valor: unknown, campo = 'o id'): number {
  return numero(valor, campo, { min: 1, inteiro: true });
}

/** 'AAAA-MM-DD' */
export function data(valor: unknown, campo: string): string {
  const v = String(valor ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) throw new ErroDeUso(`${campo} deve ser uma data válida.`);
  return v;
}

/** 'AAAA-MM' */
export function mes(valor: unknown, campo: string): string {
  const v = String(valor ?? '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(v)) throw new ErroDeUso(`${campo} deve estar no formato AAAA-MM.`);
  return v;
}

export function lista<T>(valor: unknown, campo: string): T[] {
  if (!Array.isArray(valor) || valor.length === 0) throw new ErroDeUso(`${campo} está vazio.`);
  return valor as T[];
}
