# Project Plan — Wedding Memories Gallery

**Production direction:** Postgres (Supabase/Neon) + Cloudflare R2 + Vercel from **day one** — no SQLite production path. See `docs/DEPLOY.md`.

**Owner scope (phase 1):** ~10k photos, ~10 long videos; owner import only; shared password + family link; custom domain.

---

## Gap Analysis: PRD vs Current Build

### Passing (working on local dev stack)

| # | Requirement | Status |
|---|---|---|
| 1 | App runs with `npm run dev` | Yes |
| 2 | Owner adds files to `media/wedding` | Yes (local staging) |
| 3 | `npm run import:media` | Yes (local DB + disk) |
| 4–12 | Gallery pages, auth, favorites, admin | Yes (see prior audit) |
| 17 | Originals not in git | Yes |
| 18 | Face recognition placeholder | Schema only |

### Failing or incomplete for **go-live**

| # | Issue | Severity |
|---|---|---|
| P0 | **Still on SQLite + local disk** | Blocker — C1–C3 |
| P0 | **No R2 / CDN media** | Blocker — C2–C4 |
| P0 | **No family passwordless link** | Required — C5 |
| P0 | **Prototype auth** (plaintext, API open) | Blocker for public URL — C5 |
| 13 | Admin reindex | Works locally; must target cloud import |
| 14 | Mobile not verified | Medium |
| 15 | Owner README | Medium |
| 16 | Thumbnails via Node API | Slow at 10k — fix with R2 CDN URLs |
| 19 | StorageProvider unwired | Medium — S6 + C2 |
| S2–S6 | Stabilization items | Medium — see below |

### Feature gaps (unchanged from local MVP)

| Feature | Status |
|---|---|
| photoCount/videoCount | Always 0 — S3 |
| Album cover UI | Not built |
| Album detail search | Not built |
| Video duration on import | Not built |
| ZIP download | Disabled (correct) |
| Shared Asset type | Duplicated — S2 |
| Guest uploads | **Deferred** (phase 2+) |

---

## Phase order (updated)

```
Cloud foundation (C1–C6)  ──►  Stabilization (S2–S6)  ──►  Polish (P1–P7)  ──►  Scale (SC*)  ──►  Face (FR*)  ──►  Memory
```

**Do not** complete “Scale on SQLite” then migrate. Point `DATABASE_URL` at Postgres before large imports.

---

## Cloud Foundation Phase (C1–C6) — do first

Full checklist: `docs/DEPLOY.md`.

### C1: PostgreSQL (Supabase or Neon)

- `provider = "postgresql"` in schema
- Remove `@prisma/adapter-libsql` from app + scripts
- `DATABASE_URL` only — no `file:./dev.db` in production
- Run migrations on cloud DB
- `postinstall`: `prisma generate`
- **Not using:** MongoDB, SQLite in prod

### C2: Cloudflare R2 StorageProvider

- Implement R2 (S3-compatible SDK)
- CDN public base URL for thumbnails/previews/downloads
- Deprecate serving full library through `/api/media/*` for grids

### C3: Import → R2 + Postgres

- Owner still stages files under `media/wedding/` (or chosen folder)
- Import uploads to R2, writes metadata to Postgres
- Batch/progress for ~10k files

### C4: Long video delivery

- Stream from R2/CDN with range support
- Avoid Vercel function timeouts on 1h files

### C5: Production auth

- Bcrypt `GUEST_PASSWORD` / `SiteSetting.guestPasswordHash`
- `FAMILY_VIEW_TOKEN` + route (e.g. `/view/[token]`) for parents
- `Secure` cookies, rate limit login, protect admin

### C6: Vercel + custom domain

- GitHub → Vercel, all env vars from DEPLOY.md
- Custom domain on Cloudflare/Vercel
- Test 50 assets, then full library

---

## Stabilization Phase (S1–S6)

Can run **in parallel** with C2–C3. S1 done.

| Task | Description |
|---|---|
| S2 | `src/types/asset.ts` |
| S3 | Album photo/video counts in API |
| S4 | Albums page: direct Prisma, no localhost fetch |
| S5 | `GET /api/admin/stats` |
| S6 | Wire StorageProvider (**R2**, not local-only) |

---

## Polish Phase (v0.2)

After cloud MVP is live.

| Task | Notes |
|---|---|
| P1 | Owner runbook + link DEPLOY.md |
| P2 | ~~next/font~~ — **done** |
| P3 | Video duration (ffprobe) |
| P4 | Album detail FilterBar |
| P5 | Mobile swipe, tap targets |
| P6 | Error boundaries |
| P7 | Toasts |

---

## Scale Phase (v0.3)

After **cloud** import of full library.

| Task | Notes |
|---|---|
| SC1 | Validate 10k photos + long videos on R2/CDN |
| SC2 | Infinite scroll |
| SC3 | Import progress, batching, dry-run, checksum |
| SC4 | `next/image`, blur placeholders |

---

## Face Recognition Phase (v0.5)

Unchanged — FR1–FR3 after production stable.

---

## Memory Features Phase (v0.6)

Unchanged.

---

## Guest uploads

**Not in phase 1.** Add after cloud gallery is stable.

---

## Phase Dependencies (diagram)

```
                    ┌─────────────────┐
                    │  C1 Postgres    │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ C2 R2    │  │ C5 Auth  │  │ S2–S6    │
        └────┬─────┘  └────┬─────┘  └──────────┘
             │             │
             ▼             │
        ┌──────────┐       │
        │ C3 Import│       │
        └────┬─────┘       │
             ▼             ▼
        ┌──────────┐  ┌──────────┐
        │ C4 Video │  │ C6 Deploy│
        └──────────┘  └──────────┘
```
