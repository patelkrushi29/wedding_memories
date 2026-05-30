# Auth

## How the Password Gate Works End to End

1. Guest visits any page (e.g. `/highlights`).
2. `src/middleware.ts` runs — checks for cookie `wg-auth=authenticated`.
3. Cookie missing or wrong → redirect to `/auth`.
4. Guest fills in the password form at `/auth` and submits.
5. `POST /api/auth/guest-password` is called with `{ password: "..." }`.
6. Route compares the submitted value against `process.env.GUEST_PASSWORD` (default: `"wedding"`).
7. Match → response sets cookie and returns `{ ok: true }`.
8. No match → returns `{ ok: false, error: "Invalid password" }` with HTTP 401.
9. On success, the auth page redirects the browser to `/highlights`.
10. All subsequent requests include the cookie — middleware lets them through.

## Cookie Details

| Property | Value |
|---|---|
| Name | `wg-auth` |
| Value | `authenticated` (literal string) |
| httpOnly | true (not accessible from JS) |
| path | `/` (applies to all routes) |
| maxAge | 30 days (2 592 000 seconds) |
| sameSite | Not explicitly set — defaults to Lax |
| secure | Not set — HTTP is fine for local prototype |

## Middleware Logic

`src/middleware.ts` applies to all routes except:

| Excluded path | Reason |
|---|---|
| `/api/*` | API routes handle their own auth where needed |
| `/_next/*` | Next.js static assets |
| `/generated/*` | Pre-generated thumbnails served statically |
| `/auth` (exact) | The login page itself must be reachable |
| `/favicon.ico` | Browser always fetches this without cookies |

The `config.matcher` uses a negative lookahead to exclude `_next/static`, `_next/image`, and `favicon.ico` from middleware execution entirely (Next.js edge middleware constraint).

**Important historical note:** The `.gitignore` previously used `/media/` (anchored to root) instead of `media/`. The unanchored form `media/` accidentally matched `src/app/api/media/` routes in some tools. Always use the anchored form `/media/` in `.gitignore`.

## Security Note

This is **prototype-grade auth only**. Specifically:

- Password is stored in plaintext in an environment variable.
- Cookie value is a fixed string — anyone who knows it can set it manually.
- No rate limiting on `/api/auth/guest-password`.
- No CSRF protection.
- Cookie is not `secure` — fine on localhost, wrong for HTTPS.

Do not use this auth system for anything sensitive or internet-facing.

## Upgrading to Real Auth

When this moves to production, replace the password gate with one of:

**Option A — NextAuth.js**
- Install `next-auth`, configure a credentials provider or OAuth.
- Replace middleware cookie check with `getServerSession()`.
- The `/api/auth/*` namespace is reserved by NextAuth — rename the current guest-password route to `/api/auth/guest` or similar.

**Option B — Supabase Auth**
- Use `@supabase/ssr` and `createServerClient()` in middleware.
- Replace cookie check with `supabase.auth.getUser()`.
- Supports email magic links, OAuth, and row-level security.

In both cases: remove `src/app/api/auth/guest-password/route.ts`, remove the `GUEST_PASSWORD` env var, and update `SiteSetting.guestPasswordHash` to store a bcrypt hash if a fallback password gate is still needed.
