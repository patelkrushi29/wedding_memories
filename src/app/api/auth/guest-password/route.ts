import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const correctPassword = process.env.GUEST_PASSWORD || 'wedding';

  if (password === correctPassword) {
    const response = NextResponse.json({ ok: true });
    response.cookies.set('wg-auth', 'authenticated', {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  return NextResponse.json({ ok: false, error: 'Invalid password' }, { status: 401 });
}
