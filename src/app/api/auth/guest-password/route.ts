import { NextRequest, NextResponse } from 'next/server';

const PLACEHOLDERS = new Set(['change-me', 'wedding', 'password']);

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const expected = process.env.GUEST_PASSWORD?.trim();

  // Fail closed. A missing or placeholder password must never fall back to a
  // guessable default — that silently made the whole gallery public once.
  if (!expected || PLACEHOLDERS.has(expected.toLowerCase())) {
    console.error(
      'GUEST_PASSWORD is unset or still a placeholder — refusing all logins. Set it in the environment and redeploy.'
    );
    return NextResponse.json(
      { ok: false, error: 'This gallery is not configured yet. Please contact the couple.' },
      { status: 503 }
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
