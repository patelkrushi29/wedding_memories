# Architecture

## Project Purpose

Wedding Memories Gallery is a password-gated photo and video gallery for sharing wedding media with guests.

**Target production:** Next.js on **Vercel**, metadata in **PostgreSQL** (Supabase/Neon), files on **Cloudflare R2** delivered via **CDN**. Owner imports from organized folders; guests browse and favorite — no guest uploads in phase 1.

**Current code (interim):** Same UI, but SQLite + local `media/wedding/` + API media routes — sufficient for dev only. See `docs/DEPLOY.md`.

---

## Tech Stack

| Layer | Target (production) | Current code |
|-------|---------------------|--------------|
| Framework | Next.js 16 (App Router) | Same |
| Database | **PostgreSQL** | SQLite + libsql |
| Media | **Cloudflare R2 + CDN** | Local disk + `/api/media/*` |
| Host | **Vercel** | `npm run dev` |
| UI | Radix + Tailwind | Same |
| Images | sharp (import) | Same |
| Video posters | ffmpeg (import) | Same |
| Fonts | Playfair Display + Inter (`next/font`) | Same |

---

## Directory Tree

```
src/
  app/                        Pages + API routes
  components/                 Gallery UI + ui primitives
  lib/
    db.ts                     Prisma singleton
    storage/
      types.ts                StorageProvider interface
      localStorageProvider.ts Legacy (API URLs)
      r2StorageProvider.ts    Planned (C2)
  proxy.ts                    Auth gate (Next.js 16)
prisma/
  schema.prisma
prisma.config.ts
scripts/
  db.ts                       Prisma client for scripts
  import-media.ts             Staging import → target: R2 upload
  generate-thumbnails.ts
  reset-local.ts
media/wedding/                Owner staging folder (gitignored)
public/generated/thumbnails/  Legacy local thumbs (gitignored)
```

---

## Data Flow

### Target (production)

```
Browser
  └─► src/proxy.ts (password or family-link cookie)
        └─► Next.js page / API
              └─► Prisma → PostgreSQL (Supabase/Neon)
              └─► API returns CDN URLs from StorageProvider
                    └─► Browser loads images/video from Cloudflare CDN (R2)
```

### Current (local dev)

```
Browser
  └─► src/proxy.ts
        └─► Prisma → SQLite
              └─► /api/media/[id]/* reads from disk
```

---

## Auth (target)

- Most guests: `GUEST_PASSWORD` → cookie
- Family: `/view/[FAMILY_VIEW_TOKEN]` → cookie, no password
- Details: `docs/AUTH.md`

---

## Scale assumptions

- ~10,000 photos
- ~10 one-hour videos
- Thumbnails and video **must** use CDN, not Node per request

---

## What Is NOT Built Yet

- Postgres + R2 in code (documented in DEPLOY C1–C6)
- Family view link
- Production auth (bcrypt, Secure cookies)
- Guest uploads
- Face recognition (schema only)
- ZIP download (disabled in UI)
- Vercel project / domain wiring (owner + dev)

---

## What NOT to use in production

- SQLite `dev.db`
- Serving 10k thumbnails through Vercel API routes
- Cloudinary as default storage (cost at this scale)
- MongoDB

See `docs/DEPLOY.md`.
