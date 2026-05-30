# Auth

## Production access model (planned)

| Audience | How they get in |
|----------|-----------------|
| Most guests | Shared password → `POST /api/auth/guest-password` → cookie |
| Parents / family | **Passwordless link** — no typing required |
| Admin (you) | Same password + `/admin` (reindex protected by secret) |

**Guest uploads:** not in phase 1.

Configure in production:

- `GUEST_PASSWORD` — strong secret
- `FAMILY_VIEW_TOKEN` — long random string (e.g. 32+ bytes hex)
- Family URL shape (to implement): `https://photos.yourdomain.com/view/<FAMILY_VIEW_TOKEN>`

See `docs/DEPLOY.md` (C5).

---

## Current implementation (local MVP)

### Password gate flow

1. Guest visits any page (e.g. `/highlights`).
2. `src/proxy.ts` runs — checks cookie `wg-auth=authenticated` (or family cookie when built).
3. Cookie missing or wrong → redirect to `/auth`.
4. Guest submits password on `/auth`.
5. `POST /api/auth/guest-password` with `{ "password": "..." }`.
6. Compared to `process.env.GUEST_PASSWORD` (default `"wedding"`) — **plaintext today**.
7. Success → httpOnly cookie, redirect `/highlights`.

### Family link (not built yet — C5)

Planned behavior:

1. Guest opens `/view/[FAMILY_VIEW_TOKEN]` (exact path TBD).
2. Server compares token to `process.env.FAMILY_VIEW_TOKEN` (constant-time).
3. On match → set cookie e.g. `wg-auth=family` or `authenticated`, redirect to `/highlights`.
4. `src/proxy.ts` allows access without visiting `/auth`.
5. **Security:** anyone with the link sees the full gallery — acceptable for parents; do not post link publicly.

---

## Cookie details (current)

| Property | Value | Production target |
|----------|--------|-------------------|
| Name | `wg-auth` | Same |
| Value | `authenticated` | `authenticated` or `family` |
| httpOnly | true | true |
| path | `/` | `/` |
| maxAge | 30 days | 30 days |
| secure | **not set** | **`true`** (HTTPS) |
| sameSite | Lax (default) | Lax |

---

## Proxy (`src/proxy.ts`)

Excluded paths:

| Path | Reason |
|------|--------|
| `/api/*` | Media + auth APIs (see security note) |
| `/_next/*` | Next.js assets |
| `/generated/*` | Legacy local thumbnails |
| `/auth` | Login page |
| `/view/*` | **Planned** — family link entry |
| `/favicon.ico` | Browser fetch |

---

## Security note (current — not production-ready)

- Plaintext password in env
- Fixed cookie value guessable if leaked
- No rate limiting
- `/api/*` not behind auth (media URLs work without cookie)
- Not suitable for public internet until **C5** complete

### Production hardening (C5)

- [ ] Bcrypt compare against hash (env or `SiteSetting.guestPasswordHash`)
- [ ] `Secure` + `HttpOnly` cookies
- [ ] Rate limit `/api/auth/guest-password`
- [ ] Protect `/api/admin/*` with `ADMIN_REINDEX_SECRET`
- [ ] Media: public CDN URLs on R2 (obscure IDs) or signed URLs with TTL
- [ ] Document family link rotation if token is leaked

---

## Upgrading auth (optional later)

**v0.2 uses custom password + family link** — no Supabase Auth required.

**Later options:**

**NextAuth.js** — credentials or OAuth; reserve `/api/auth/*` namespace conflict with guest route rename.

**Supabase Auth** — magic links, OAuth; only if you want email-based login for many users.

For phase 1, bcrypt + cookies + family token is enough.
