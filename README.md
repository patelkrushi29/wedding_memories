# Wedding Memories Gallery

A private wedding photo and video gallery for family and guests. Built with Next.js, Prisma, and Tailwind CSS.

**Default branch:** `main` (unified baseline: app MVP + `.claude/` tooling + cloud deploy docs).

## Going live?

**Read [`docs/DEPLOY.md`](docs/DEPLOY.md)** — production uses **PostgreSQL** (Supabase or Neon), **Cloudflare R2** for media, and **Vercel** for hosting. We are **not** using SQLite or a local-database-then-migrate path in production.

**Owner scale:** ~10k photos, long videos, shared password + passwordless family link, custom domain. Owner imports media; guest uploads come later.

## Features

- Password-protected gallery (+ planned family link without password)
- Photo and video support
- Albums from folder structure
- Masonry grid, lightbox, favorites, admin reindex
- Target: CDN-backed media at scale

## Setup (R2 + Supabase — typical)

### 1. Install

```bash
npm install
```

### 2. Environment

Copy `.env.example` → `.env` and set **Supabase** `DATABASE_URL` and **R2** variables. You do **not** need a `media/wedding` folder if files are already in the bucket.

### 3. Database

```bash
npx prisma migrate deploy
```

### 4. Index files already in R2

Upload to bucket `family-photos` under prefix `media/` (e.g. `media/test1.jpg` or `media/Ceremony/photo.jpg`), then:

```bash
npm run sync:r2
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — password from `GUEST_PASSWORD` in `.env`.

Optional: `npm run import:media` only if you stage files on disk first (`MEDIA_ROOT`).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run sync:r2` | **Index objects already in R2** `media/` → Postgres |
| `npm run import:media` | Optional: copy from local `MEDIA_ROOT` folder → R2 + DB |
| `npm run generate:thumbnails` | Regenerate missing thumbnails |
| `npm run reset:local` | Wipe local DB + generated thumbs (legacy dev) |
| `npm run db:studio` | Prisma Studio |

## Documentation

| Doc | Purpose |
|-----|---------|
| [`CLAUDE.md`](CLAUDE.md) | Agent operating manual |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | **Production setup (start here for go-live)** |
| [`docs/TASKS.md`](docs/TASKS.md) | Current tasks |
| [`docs/PLAN.md`](docs/PLAN.md) | Phases and gap analysis |

## Folder structure

```
src/app/          Pages and API routes
src/components/   UI
src/lib/          DB, storage
scripts/          Import and maintenance
prisma/           Schema and migrations
(R2 bucket)       family-photos/media/… — source of truth for files
media/wedding/    Optional local staging only (gitignored)
docs/             Full documentation
```
