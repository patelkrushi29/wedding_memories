/**
 * Guest session token.
 *
 * The cookie used to hold the literal string "authenticated", which anyone could
 * set by hand in devtools and walk straight past the password. It now holds an
 * HMAC of a fixed label keyed by GUEST_PASSWORD, so it can only be minted by
 * someone who knew the password — and changing the password signs everyone out.
 *
 * Web Crypto only, so the same code runs in the proxy and in route handlers.
 */

export const AUTH_COOKIE = 'wg-auth';
const LABEL = 'wedding-memories/guest/v1';

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The token a valid session carries, or null when no password is configured. */
export async function expectedGuestToken(): Promise<string | null> {
  const secret = process.env.GUEST_PASSWORD?.trim();
  if (!secret) return null;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return toHex(await crypto.subtle.sign('HMAC', key, enc.encode(LABEL)));
}

/** Length-independent comparison so a wrong guess doesn't leak how close it was. */
export function safeEqual(a: string, b: string): boolean {
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < max; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

export async function isValidGuestToken(value: string | undefined): Promise<boolean> {
  if (!value) return false;
  const expected = await expectedGuestToken();
  return expected !== null && safeEqual(value, expected);
}
