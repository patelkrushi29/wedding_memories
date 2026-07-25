import { NextRequest, NextResponse } from 'next/server';

const WEAK = new Set(['change-me', 'wedding', 'password']);

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const expected = process.env.GUEST_PASSWORD?.trim();

  // Fail closed when unconfigured. This route used to fall back to the literal
  // string 'wedding', which silently made the gallery public. It must never
  // accept a value the owner did not choose.
  if (!expected) {
    console.error(
      'GUEST_PASSWORD is not set — refusing all logins. Set it in the environment and redeploy.'
    );
    return NextResponse.json(
      { ok: false, error: 'This gallery is not configured yet. Please contact the couple.' },
      { status: 503 }
    );
  }

  // A weak password is the owner's call to make, not ours to veto — just say so.
  if (WEAK.has(expected.toLowerCase())) {
    console.warn(
      `GUEST_PASSWORD is "${expected}", which is among the first things anyone would guess for a wedding gallery.`
    );
  }

  if (password === expected) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set('wg-auth', 'authenticated', {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  }

  return NextResponse.json({ ok: false, error: 'Invalid password' }, { status: 401 });
}
