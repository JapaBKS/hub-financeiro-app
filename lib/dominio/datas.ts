// ============================================================================
// lib/dominio/datas.ts
//
// Todo "hoje" do app passa por aqui.
//
// Por quê: o servidor da Vercel roda em UTC, 3 horas à frente de Brasília.
// `new Date().toISOString()` às 21h daqui já devolve o dia seguinte — e isso
// contaminava a data pré-preenchida nos formulários, o corte de provento
// futuro, o alerta de contas a vencer e a apuração por mês.
//
// A correção não é subtrair 3 horas na mão: o Brasil já teve horário de verão
// e pode voltar a ter. Usamos a API de fuso do próprio JavaScript, que conhece
// as regras de cada época.
// ============================================================================

export const FUSO = 'America/Sao_Paulo';

/** Data de hoje no fuso de Brasília, no formato 'AAAA-MM-DD'. */
export function hojeISO(fuso = FUSO): string {
  // 'en-CA' formata como AAAA-MM-DD, que é exatamente o formato ISO de data
  return new Date().toLocaleDateString('en-CA', { timeZone: fuso });
}

/** Mês corrente, 'AAAA-MM'. */
export function mesAtual(fuso = FUSO): string {
  return hojeISO(fuso).slice(0, 7);
}

/** Primeiro dia do mês corrente, 'AAAA-MM-01'. */
export function inicioDoMes(fuso = FUSO): string {
  return `${mesAtual(fuso)}-01`;
}

/** Converte qualquer data para 'AAAA-MM-DD' no fuso de Brasília. */
export function paraISO(data: Date | string, fuso = FUSO): string {
  const d = typeof data === 'string' ? new Date(data) : data;
  return d.toLocaleDateString('en-CA', { timeZone: fuso });
}

/** Soma dias a uma data 'AAAA-MM-DD' sem esbarrar em fuso. */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
  const data = new Date(a, m - 1, d + dias);   // construtor local: sem UTC no meio
  const p = (n: number) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${p(data.getMonth() + 1)}-${p(data.getDate())}`;
}

/** Carimbo completo para colunas de auditoria (updated_at). Aqui UTC é o certo. */
export function agoraISO(): string {
  return new Date().toISOString();
}
