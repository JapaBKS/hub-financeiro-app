import { NextResponse } from 'next/server';

// Protege todas as rotas com uma senha simples (cookie).
// Quem não tiver o cookie certo é mandado pra /login.
export function middleware(request) {
  const senha = process.env.APP_PASSWORD;
  const cookie = request.cookies.get('app_auth')?.value;
  if (cookie === senha) {
    return NextResponse.next();
  }
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!login|api/login|_next/static|_next/image|favicon.ico).*)'],
};
