import { NextResponse } from 'next/server';

export async function POST(request) {
  const { senha } = await request.json().catch(() => ({}));
  if (senha && senha === process.env.APP_PASSWORD) {
    const res = NextResponse.json({ ok: true });
    res.cookies.set('app_auth', process.env.APP_PASSWORD, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });
    return res;
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
