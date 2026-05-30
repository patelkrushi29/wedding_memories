# Deployment & Production Guide

**Purpose:** Single source of truth for going live. Read this before any production or cloud-database work.

**Owner decisions (locked in):**
- ~10,000 photos + ~10 one-hour videos
- **Owner uploads only** in phase 1 (no guest uploads)
- **Shared guest password** + **passwordless family link** for parents
- **Custom domain**
- **GitHub** for source control
- **No SQLite in production** — start with **Postgres** (Supabase or Neon), not “local DB then migrate later”
- **Cloudflare R2** for media + CDN (not Cloudinary at this scale)

---

## Target production stack

| Layer | Service | Role |
|-------|---------|------|
| App host | **Vercel** | Next.js app, HTTPS, custom domain |
| Database | **Supabase** or **Neon** | **PostgreSQL** — albums, assets metadata only |
| Media | **Cloudflare R2** | Originals, thumbnails, video files |
| CDN | **Cloudflare** (with R2) | Fast image/video delivery worldwide |
| DNS | **Cloudflare** (recommended) | Domain + optional `media.` subdomain |
| Code | **GitHub** | Deploy trigger for Vercel |

**Do not use:** MongoDB (wrong data model for this app), Cloudinary as default (~10k photos + long video is expensive), SQLite/`dev.db` in production.

---

## What “CDN” means here

A **CDN** caches files on edge servers close to guests. When R2 is exposed through Cloudflare’s CDN, a photo requested in India is served from a nearby cache—not from your app server on every click.

**Grids and videos should load from R2/CDN URLs**, not from Vercel serverless functions streaming disk files.

---

## Current code vs target (important)

| Piece | Today (repo) | Target (go-live) |
|-------|----------------|------------------|
| Database | SQLite + libsql adapter | **PostgreSQL** via `DATABASE_URL` |
| Media | `media/wedding/` + `/api/media/[id]/*` | **R2** URLs in DB; CDN for delivery |
| Auth | Single password cookie | Password + **family view link** + bcrypt |
| Import | Local scan → local thumbs | Scan locally → **upload to R2** → Postgres rows |

Until cloud tasks are implemented, developers may use SQLite **only** for short local UI checks. **New work should target Postgres + R2**, not extend the local-only path.

---

## Accounts to create (owner)

Do these once; save secrets in a password manager.

### 1. Cloudflare
1. Sign up at [cloudflare.com](https://cloudflare.com).
2. **R2** → Create bucket (e.g. `wedding-media`).
3. Create **R2 API token** (Object Read & Write).
4. Note **Account ID**, **Access Key ID**, **Secret Access Key**.
5. Add your domain to Cloudflare (nameservers at registrar).
6. (Later) Public bucket or custom domain for media, e.g. `media.yourdomain.com`.

### 2. Database — Supabase or Neon

**Supabase** ([supabase.com](https://supabase.com)):
1. New project → choose region near most guests.
2. Save database password.
3. Copy **connection string** (URI) for `DATABASE_URL`.
4. Use **Postgres only** for v1 — Auth/Storage optional later.

**Neon** ([neon.tech](https://neon.tech)) — alternative:
1. New project → copy `DATABASE_URL`.
2. Same Prisma usage as Supabase.

### 3. Vercel
1. [vercel.com](https://vercel.com) → Sign in with GitHub.
2. Import the repo when code is ready.
3. Add environment variables (see below).

### 4. Domain
- Point DNS to Vercel (app, e.g. `photos.yourdomain.com`).
- Point media subdomain to R2/Cloudflare per Cloudflare docs.

---

## Environment variables

### Production (Vercel)

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Postgres URI from Supabase/Neon |
| `GUEST_PASSWORD` | Yes | Strong password for most guests |
| `FAMILY_VIEW_TOKEN` | Yes | Long random string; used in family link URL |
| `ADMIN_REINDEX_SECRET` | Yes | Protects `POST /api/admin/reindex` |
| `R2_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Yes | R2 API token |
| `R2_SECRET_ACCESS_KEY` | Yes | R2 API token |
| `R2_BUCKET_NAME` | Yes | e.g. `wedding-media` |
| `R2_PUBLIC_BASE_URL` | Yes | Public CDN base for objects, e.g. `https://media.yourdomain.com` |
| `NEXT_PUBLIC_APP_NAME` | No | Display name |

### Local development (during cloud build-out)

Use the **same Postgres** project as production (or a separate “dev” branch/database on Neon/Supabase). **Avoid** `file:./dev.db` for new team work.

Optional: keep `MEDIA_ROOT` for import script staging before upload to R2.

---

## Implementation checklist (developer)

Complete in roughly this order. Details in `docs/PLAN.md` (Cloud Phase).

### C1 — PostgreSQL
- [ ] Change `prisma/schema.prisma` → `provider = "postgresql"`
- [ ] Remove libsql adapter from `src/lib/db.ts` and `scripts/db.ts`
- [ ] Update `prisma.config.ts` to use `env("DATABASE_URL")`
- [ ] Run `npx prisma migrate deploy` against Supabase/Neon
- [ ] Add `postinstall`: `prisma generate` in `package.json`
- [ ] Update `docs/DATABASE.md`

### C2 — Cloudflare R2 storage provider
- [ ] Implement `src/lib/storage/r2StorageProvider.ts` (or S3-compatible client → R2)
- [ ] Store `thumbnailUrl`, `previewUrl`, `downloadUrl` (or keys) in API responses from provider
- [ ] Schema: add fields if needed (`storageKey`, `cdnUrl`) — keep `originalPath` server-only or replace with R2 key
- [ ] Update `docs/STORAGE.md`

### C3 — Import pipeline uploads to R2
- [ ] `scripts/import-media.ts`: generate thumbs with sharp locally → upload original + thumb to R2
- [ ] Write Postgres rows with cloud URLs/keys
- [ ] Progress logging for 10k files
- [ ] Update `docs/MEDIA-IMPORT.md`

### C4 — Video delivery
- [ ] Long videos (~1 hr) served from **R2/CDN** with range requests
- [ ] Do not proxy full video through Vercel API (timeout + cost)
- [ ] Posters/thumbnails in R2

### C5 — Auth for production
- [ ] Bcrypt for `GUEST_PASSWORD` (or `SiteSetting.guestPasswordHash`)
- [ ] Cookie: `Secure`, `HttpOnly`, `SameSite=Lax`
- [ ] **Family link:** e.g. `/view/[FAMILY_VIEW_TOKEN]` sets `wg-auth=family` cookie, bypasses password form
- [ ] Rate limit `POST /api/auth/guest-password`
- [ ] Update `docs/AUTH.md`

### C6 — Deploy
- [ ] Vercel project + env vars
- [ ] Custom domain + HTTPS
- [ ] Protect admin routes
- [ ] Smoke test: 50 photos + 1 short video, then full library

### Stabilization (parallel / before large import)
- [ ] S2–S6 in `docs/TASKS.md` (shared types, album counts, no localhost fetch, admin stats, StorageProvider wired)

---

## Owner workflow (phase 1 — manual upload)

1. Organize files on your computer:
   ```
   media/wedding/
     Highlights/
     Ceremony/
     ...
   ```
2. Developer runs import (uploads to R2 + fills Postgres):
   ```bash
   npm run import:media
   ```
3. Guests open `https://photos.yourdomain.com` → enter password.
4. Parents open **family link** (no password):  
   `https://photos.yourdomain.com/view/<FAMILY_VIEW_TOKEN>`  
   (exact route implemented in C5.)

**Adding more photos later:** add files to folders → run import again (or Admin reindex when wired to cloud).

---

## Scale expectations

| Content | Rough storage |
|---------|----------------|
| 10k JPEGs @ 3–5 MB | 30–50 GB |
| 10 × 1 h video | 20–40+ GB |
| **Total** | ~50–90+ GB |

R2 storage is ~$0.015/GB/month; egress to Cloudflare CDN is typically **no R2 egress fee**. Budget **~$5–40/month** for app + DB + R2 at family traffic (excluding domain).

---

## Security before sharing publicly

- [ ] Strong `GUEST_PASSWORD` (not `wedding`)
- [ ] `FAMILY_VIEW_TOKEN` long and unguessable; treat link like a password
- [ ] HTTPS only (Vercel default)
- [ ] Admin reindex requires secret
- [ ] No `originalPath` or R2 keys leaked in JSON APIs
- [ ] Test on mobile (Safari + Chrome)

---

## Guest uploads

**Out of scope for phase 1.** Documented for a later version. Only owner import/reindex.

---

## Related docs

| Doc | Contents |
|-----|----------|
| `docs/PLAN.md` | Phases C1–C6, stabilization, polish |
| `docs/DATABASE.md` | Schema, Postgres notes |
| `docs/STORAGE.md` | StorageProvider, R2 |
| `docs/AUTH.md` | Cookies, family link |
| `docs/MEDIA-IMPORT.md` | Folder rules, import steps |
| `docs/TESTING.md` | Verification checklists |

---

## Quick answers

| Question | Answer |
|----------|--------|
| Supabase vs MongoDB vs AWS RDS? | **Postgres** (Supabase or Neon). Not MongoDB. |
| Cloudinary? | Skip for this library size; use **R2 + CDN**. |
| Local SQLite? | **Deprecated for new work**; not used in production. |
| Two access modes? | Password + family link (to be built in C5). |
