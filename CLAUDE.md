# Wedding Memories — Claude Code Guide

## What this project is

A self-hosted, password-gated photo and video gallery for sharing wedding media with guests, running entirely on a local machine with no cloud dependencies.

## Current status

Version 0.1 local MVP. Running locally only. No cloud services connected.

## How to start working on something

Read **only the doc file relevant to your task** — do not load all docs at once.

| Task | Read |
|---|---|
| Changing DB schema or models | `docs/DATABASE.md` |
| Auth, cookies, or middleware | `docs/AUTH.md` |
| Adding a page or component | `docs/COMPONENTS.md` |
| Import script or media processing | `docs/MEDIA-IMPORT.md` |
| API routes | `docs/API.md` |
| Storage / file serving | `docs/STORAGE.md` |
| Future features or roadmap | `docs/ROADMAP.md` |
| Full architecture overview | `docs/ARCHITECTURE.md` |

## Critical rules (always apply)

- **Never load original media files as grid images** — always use thumbnail URLs (`/api/media/[id]/thumbnail`)
- **Never accept raw file paths from the client** — only asset IDs; server resolves paths from DB
- **Pagination default is 60 items** — never query all assets at once; always use `skip`/`take`
- **Auth cookie:** `wg-auth=authenticated` — set by `POST /api/auth/guest-password`, checked in `src/middleware.ts`
- **`media/` and `public/generated/` are gitignored** — never commit media files or generated thumbnails
- **`Asset.type` is a plain String `"PHOTO"` or `"VIDEO"`** — not a Prisma enum (SQLite limitation); use `.toUpperCase()` when filtering

## Key file locations

| Thing | File |
|---|---|
| Prisma client singleton | `src/lib/db.ts` |
| Prisma schema (5 models) | `prisma/schema.prisma` |
| Prisma 7 datasource config | `prisma.config.ts` |
| Middleware (auth check) | `src/middleware.ts` |
| Auth API route | `src/app/api/auth/guest-password/route.ts` |
| Asset API route | `src/app/api/assets/route.ts` |
| Media serving routes | `src/app/api/media/[id]/thumbnail|preview|download/route.ts` |
| StorageProvider interface | `src/lib/storage/types.ts` |
| Local storage provider | `src/lib/storage/localStorageProvider.ts` |
| Import script | `scripts/import-media.ts` |
| Thumbnail-only script | `scripts/generate-thumbnails.ts` |
| Reset script | `scripts/reset-local.ts` |
| Favourites component | `src/components/FavoriteButton.tsx` |
| Media lightbox | `src/components/MediaViewerModal.tsx` |
| UI primitives (hand-built) | `src/components/ui/` |

## Non-goals (do not add these without discussion)

- Cloud storage (Cloudinary, S3, Supabase Storage)
- Supabase backend or authentication
- Vercel deployment config
- Face recognition or Find Yourself feature (schema exists, no logic)
- Guest uploads
- ZIP download (button exists but disabled)
- Email sharing, watermarking, or access expiry
- Landing page (first page after auth is `/highlights`)
