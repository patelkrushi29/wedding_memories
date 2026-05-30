# Task Tracker

**Purpose:** Start every new Claude Code session by reading this file + CLAUDE.md. This tells you exactly what's done, what's next, and what to work on.

**Last updated:** 2026-05-30, Session 2 — unified on `main` branch (`259e2bb` baseline)

---

## How to use this file

1. Read the "Current Status" section
2. Look at "Next Up" — **cloud foundation (C1–C6) before relying on local SQLite**
3. After completing a task, move it to "Completed" with the date
4. Decisions → `docs/CHANGELOG.md` and `docs/DECISIONS.md`
5. Bugs → "Known Bugs" below

---

## Current Status

**Version:** 0.1 app MVP  
**Phase:** **Cloud foundation** — Postgres + R2 + Vercel (no local-DB production path)  
**Target library:** ~10k photos, ~10 × 1h videos  
**Access:** Shared password + passwordless family link (to build)  
**Owner uploads only** in phase 1; guest uploads later  

**The app runs locally:** Yes (SQLite) for UI dev — **not** the production architecture.  
**Production stack (documented):** See `docs/DEPLOY.md` — Supabase/Neon + Cloudflare R2 + Vercel + custom domain.  
**Owner has GitHub:** Yes.

---

## Completed

| Task | Date | Notes |
|---|---|---|
| Initial Next.js + Prisma + Tailwind setup | 2026-05-30 | Commit `888982d` |
| Full MVP: 10 pages, 8 API routes, 9 components | 2026-05-30 | Commit `c983183` |
| Documentation system | 2026-05-30 | CLAUDE.md + docs/ |
| S1: Smoke test — local MVP | 2026-05-30 | Pages, auth, import, thumbnails |
| Bug fix: Import script Prisma 7 | 2026-05-30 | `scripts/db.ts` + libsql adapter |
| Bug fix: CSS @import → next/font | 2026-05-30 | Playfair Display + Inter |
| Bug fix: originalPath in API responses | 2026-05-30 | Stripped from guest JSON |
| Windows DB URL fix | 2026-05-30 | `pathToFileURL()` in db.ts (SQLite dev only) |
| Production docs + cloud-first plan | 2026-05-30 | `docs/DEPLOY.md`, PLAN/ROADMAP/STORAGE/AUTH updated |

---

## Next Up

### PRIORITY: Cloud foundation (do not invest in SQLite for production)

Read **`docs/DEPLOY.md`** for full detail. Summary:

### C1: PostgreSQL (Supabase or Neon) — no local DB for new work
- [ ] `schema.prisma` → `postgresql`
- [ ] Remove libsql from `src/lib/db.ts`, `scripts/db.ts`
- [ ] `prisma.config.ts` → `env("DATABASE_URL")`
- [ ] Migrate against cloud DB; `postinstall`: `prisma generate`
- [ ] Owner creates Supabase/Neon project; devs use that `DATABASE_URL`

### C2: Cloudflare R2 StorageProvider
- [ ] `r2StorageProvider.ts` (S3-compatible API)
- [ ] Env vars: `R2_*`, `R2_PUBLIC_BASE_URL`
- [ ] Wire API responses to CDN URLs

### C3: Import uploads to R2
- [ ] `import-media.ts`: sharp thumbs → upload originals + thumbs to R2
- [ ] Postgres rows store keys/URLs, not local absolute paths
- [ ] Progress + error reporting for 10k files

### C4: Video via CDN
- [ ] Hour-long videos from R2 (range requests), not Vercel API proxy

### C5: Production auth
- [ ] Bcrypt password, `Secure` cookies
- [ ] Family link: `/view/[token]` using `FAMILY_VIEW_TOKEN`
- [ ] Rate limit login; protect admin reindex

### C6: Vercel + custom domain
- [ ] Deploy, env vars, DNS
- [ ] Smoke test 50 assets → full library

### Stabilization (in parallel with C2–C3)
- [ ] **S2** — `src/types/asset.ts`
- [ ] **S3** — album photo/video counts
- [ ] **S4** — albums page: Prisma not localhost fetch
- [ ] **S5** — `GET /api/admin/stats`
- [ ] **S6** — StorageProvider wired (R2, not local-only)

### Owner prep (can do anytime)
- [ ] Cloudflare account + R2 bucket
- [ ] Supabase or Neon project
- [ ] Vercel linked to GitHub
- [ ] Custom domain DNS
- [ ] Organize `media/wedding/` folders on disk for first import

---

## Backlog (after cloud MVP live)

| Task | Priority | Notes |
|---|---|---|
| P1: Owner-friendly README / runbook | High | Link to DEPLOY.md |
| P2: Video duration (ffprobe) on import | Medium | |
| P3: Search/filter on album detail | Medium | |
| P4: Mobile QA with real library | High | |
| P5: Error boundaries | Medium | |
| P6: Toasts | Low | |
| Guest uploads | Later | Explicitly out of phase 1 |
| ZIP download selected | Later | Button exists, disabled |

---

## Known Bugs

| Bug | Severity | Status |
|---|---|---|
| Code still uses SQLite + local files | **Blocker for prod** | C1–C3 |
| photoCount/videoCount always 0 | Medium | S3 |
| Albums page localhost self-fetch | Medium | S4 |
| Admin 4 API calls for counts | Low | S5 |
| StorageProvider dead code | Medium | S6 + C2 |
| No family view link | Medium | C5 |
| No error boundaries | Low | P5 |

---

## Session Handoff Instructions

1. Read `CLAUDE.md` + this file + **`docs/DEPLOY.md`**
2. Pick **C1** unless owner only needs doc/account setup
3. Do **not** plan SQLite → Postgres migration; implement Postgres directly
4. On completion: update docs, `CHANGELOG.md`

**Quick start for next session:**
> Read CLAUDE.md, docs/TASKS.md, and docs/DEPLOY.md. Start C1 (Postgres) and C2 (R2 provider). Skip extending SQLite-only features.
