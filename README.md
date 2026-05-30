# Wedding Memories Gallery

A private wedding photo and video gallery for family and guests. Built with Next.js, Prisma, and Tailwind CSS.

## Going live?

**Read [`docs/DEPLOY.md`](docs/DEPLOY.md)** — production uses **PostgreSQL** (Supabase or Neon), **Cloudflare R2** for media, and **Vercel** for hosting. We are **not** using SQLite or a local-database-then-migrate path in production.

**Owner scale:** ~10k photos, long videos, shared password + passwordless family link, custom domain. Owner imports media; guest uploads come later.

## Features

- Password-protected gallery (+ planned family link without password)
- Photo and video support
- Albums from folder structure
- Masonry grid, lightbox, favorites, admin reindex
- Target: CDN-backed media at scale

## Local development (interim)

Until cloud tasks (C1–C3) land in code, you can run the legacy local stack:

### 1. Install

```bash
npm install
npx prisma generate
```

### 2. Environment

```bash
cp .env.example .env
```

For new work, prefer pointing `DATABASE_URL` at a **dev Postgres** instance (see DEPLOY.md) instead of SQLite.

### 3. Database

```bash
npx prisma migrate dev
```

### 4. Add media

```
media/wedding/
  Highlights/
  Ceremony/
  ...
```

### 5. Import and run

```bash
npm run import:media
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — default password `wedding` (change in `.env`).

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run import:media` | Import from `MEDIA_ROOT` (→ R2 when cloud import ships) |
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
media/wedding/    Staging folder for import (gitignored)
docs/             Full documentation
```
