import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, expectedGuestToken, safeEqual } from '@/lib/auth/guestToken';

const WEAK = new Set(['change-me', 'wedding', 'password']);

// Attempt throttle. In-memory, so it is per serverless instance and resets on a
// cold start — it slows a scripted guesser down a great deal without needing a
// database or Redis, which is the right trade for a single shared password.
const WINDOW_MS = 10 * 60 * 1000;
const MAX_FAILURES = 8;
const failures = new Map<string, number[]>();

function clientKey(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

function recentFailures(key: string, now: number): number[] {
  const list = (failures.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (list.length) failures.set(key, list);
  else failures.delete(key);
  return list;
}

export async function POST(request: NextRequest) {
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

  const key = clientKey(request);
  const now = Date.now();
  const recent = recentFailures(key, now);
  if (recent.length >= MAX_FAILURES) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    return NextResponse.json(
      { ok: false, error: 'Too many tries. Wait a few minutes and try again.' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  // A weak password is the owner's call to make, not ours to veto — just say so.
  if (WEAK.has(expected.toLowerCase())) {
    console.warn(
      `GUEST_PASSWORD is "${expected}", which is among the first things anyone would guess for a wedding gallery.`
    );
  }

  let password = '';
  try {
    const body = await request.json();
    password = typeof body?.password === 'string' ? body.password.trim() : '';
  } catch {
    // fall through as a wrong password
  }

  if (password && safeEqual(password, expected)) {
    failures.delete(key);
    const token = (await expectedGuestToken())!;
    const response = NextResponse.json({ ok: true });
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 90, // a season — guests come back for months
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  }

  recent.push(now);
  failures.set(key, recent);
  return NextResponse.json({ ok: false, error: 'Invalid password' }, { status: 401 });
}
