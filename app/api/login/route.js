import { NextResponse } from 'next/server';

export async function POST(request) {
  const { senha } = await request.json().catch(() => ({}));
  const dono = process.env.APP_PASSWORD;
  const pai = process.env.PAI_PASSWORD;

  let valor = null, role = null;
  if (senha && senha === dono) { valor = dono; role = 'dono'; }
  else if (senha && pai && senha === pai) { valor = pai; role = 'pai'; }

  if (valor) {
    const res = NextResponse.json({ ok: true, role });
    const base = { secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 };
    res.cookies.set('app_auth', valor, { ...base, httpOnly: true });   // segredo (protege o acesso)
    res.cookies.set('app_role', role, { ...base, httpOnly: false });    // legível p/ a nav ajustar os links
    return res;
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
