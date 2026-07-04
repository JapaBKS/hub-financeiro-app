import { NextResponse } from 'next/server';

// Dois papéis por senha:
// - APP_PASSWORD  -> "dono": acesso total
// - PAI_PASSWORD  -> "pai": só o Caixa (e as APIs que o Caixa usa)
export function middleware(request) {
  const dono = process.env.APP_PASSWORD;
  const pai = process.env.PAI_PASSWORD;
  const cookie = request.cookies.get('app_auth')?.value;
  const path = request.nextUrl.pathname;

  // dono: libera tudo
  if (dono && cookie === dono) return NextResponse.next();

  // pai: só o Caixa e as rotas/apis que ele precisa
  if (pai && cookie === pai) {
    const permitido =
      path === '/caixa' ||
      path.startsWith('/caixa/') ||
      path.startsWith('/api/cashbook') ||
      path.startsWith('/api/recurring') ||
      path.startsWith('/api/fatura-pai') ||
      path.startsWith('/api/login');
    if (permitido) return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = '/caixa';
    return NextResponse.redirect(url);
  }

  // não autenticado
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!login|api/login|_next/static|_next/image|favicon.ico).*)'],
};
