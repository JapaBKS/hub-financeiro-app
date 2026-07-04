import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  const base = { path: '/', maxAge: 0 };
  res.cookies.set('app_auth', '', base);
  res.cookies.set('app_role', '', base);
  return res;
}
