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

## Current state — deployed and working

The cloud stack is live. This section used to describe a SQLite-to-Postgres migration; that work is
done and the migration path is gone.

| Piece | State |
|-------|-------|
| Database | **Postgres** (Supabase) via `DATABASE_URL`. No SQLite anywhere. |
| Media | R2 keys in the database, delivered from the public r2.dev base URL in three tiers. |
| Auth | Single shared password, httpOnly + Secure cookie, fails closed when unconfigured. Family link still to build. |
| Import | `sync:r2` indexes R2 → Postgres and derives every tier. |

### The one Vercel gotcha that will bite you

`DATABASE_URL` **must** be the Supabase **pooler** connection string. The direct
`db.<ref>.supabase.co` host resolves to IPv6 only, which Vercel cannot reach — every request
returns a 500 with an empty body, and the gallery looks simply empty rather than broken.

Also: Vercel binds environment variables at deploy time. Changing one in the dashboard does nothing
to the running deployment until you **redeploy**.

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

### Local development

Point `.env` at the **same** Supabase project as production — there is no separate dev database, so
local changes are live changes. For local work the direct `db.<ref>.supabase.co` host is fine; only
Vercel needs the pooler.

`MEDIA_ROOT` is local-only: the default folder for `upload:r2` when `--from` is omitted.

---

## What is still to build

The cloud checklist that used to live here (C1–C6) is complete. The remaining work is in
`docs/PLAN.md`: faces (Phase C), derived facets (D), voice notes and the venue wall (E), and sharing
— bulk zip, share-sheet saving, the family link, and closing the `/api/*` auth gap (F).

Still open from the original go-live list:

- [ ] Family view link — `/view/[FAMILY_VIEW_TOKEN]`, passwordless for parents
- [ ] Rate limit `POST /api/auth/guest-password`
- [ ] Hash the guest password rather than comparing plaintext
- [ ] Custom domain
- [ ] Video posters generated on import (ffmpeg) instead of uploaded by hand

---

## Owner workflow (phase 1 — manual upload)

1. Organize files on your computer:
   ```
   media/wedding/
     Highlights/
     Ceremony/
     ...
   ```
2. Upload, index, and group:
   ```bash
   npm run upload:r2 -- --from "D:/path/to/originals"
   npm run sync:r2
   npm run cluster:events
   ```
3. Open `/admin`, name each candidate function, publish it.
4. Guests open the site → enter the password.
5. Parents open the **family link** (no password) — route not built yet, Phase F3 in `docs/PLAN.md`.

**Adding more photos later:** run the same three commands. All of them skip work that's already
done, so re-running is cheap and safe.

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
