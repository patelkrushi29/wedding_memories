import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE, isValidGuestToken } from '@/lib/auth/guestToken';

/** Paths anyone may load: the gate itself and what it needs to render. */
function isPublic(pathname: string): boolean {
  return (
    pathname === '/auth' ||
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/apple-touch-icon.png' ||
    /^\/icon-\d+\.png$/.test(pathname)
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  // Host API authenticates itself with a bearer token (see isAdminAuthorized),
  // so a host using a script or another device isn't forced through the guest gate.
  if (pathname.startsWith('/api/admin/')) return NextResponse.next();

  if (await isValidGuestToken(request.cookies.get(AUTH_COOKIE)?.value)) {
    return NextResponse.next();
  }

  // The gallery JSON used to answer anyone with the URL. API callers get a 401
  // rather than a redirect, so client code can tell "signed out" from "empty".
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = '/auth';
  url.search = pathname === '/' ? '' : `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
