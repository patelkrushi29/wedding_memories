# Wedding Memories — Claude Code Operating Manual

A self-hosted wedding photo/video gallery. Local-first MVP: Next.js + SQLite + Prisma, no cloud services.

## Quick orientation

| What you need | Read this |
|---|---|
| Why something was built a certain way | `docs/DECISIONS.md` |
| Full directory map and data flow | `docs/ARCHITECTURE.md` |
| DB schema, Prisma setup, migrations | `docs/DATABASE.md` |
| Auth, cookies, middleware | `docs/AUTH.md` |
| Import script, folders, thumbnails | `docs/MEDIA-IMPORT.md` |
| API routes, params, responses | `docs/API.md` |
| Pages and components, props, state | `docs/COMPONENTS.md` |
| StorageProvider interface | `docs/STORAGE.md` |
| What's planned for future versions | `docs/ROADMAP.md` |

Read **only the file relevant to your task**. Do not load all docs at once.

## Rules that always apply

### Security
- Never accept raw file paths from the client — only asset IDs. The server resolves paths from the DB.
- Never expose `asset.originalPath` in API responses.
- Auth cookie: `wg-auth=authenticated`, set httpOnly by `POST /api/auth/guest-password`.

### Performance
- Never load original images in grids — always use `/api/media/[id]/thumbnail`.
- Never query all assets at once — always paginate with `skip`/`take`, default limit 60.
- Videos use `preload="metadata"` only.

### Data
- `Asset.type` is a plain String (`"PHOTO"` or `"VIDEO"`), not a Prisma enum. SQLite has no native enums.
- `media/` and `public/generated/` are gitignored. Never commit media or thumbnails.
- The database file is `prisma/dev.db` (also gitignored).

## Prisma 7 — read this before touching the DB

This project uses Prisma 7, which works differently from Prisma 5/6. **Do not follow standard Prisma tutorials without checking here first.**

- The `datasource` block in `schema.prisma` has **no `url` field**. The URL lives in `prisma.config.ts`.
- The app uses the `@prisma/adapter-libsql` driver adapter for SQLite. The singleton in `src/lib/db.ts` creates `PrismaLibSql({ url })` and passes it as an adapter.
- `resolveDbUrl()` in `db.ts` converts relative `file:./dev.db` to absolute `file:///abs/path/dev.db` because libsql rejects relative paths.
- The `as any` cast on `new PrismaClient({ adapter })` suppresses a type mismatch — this is intentional, do not remove it.
- **The import scripts** (`scripts/import-media.ts`, etc.) use `new PrismaClient()` directly without the libsql adapter. Prisma 7 reads the URL from `prisma.config.ts` at runtime so this works, but the two PrismaClient creation paths are inconsistent.

If you need to change how the DB connects, update BOTH `src/lib/db.ts` and the scripts.

## Known tech debt and inconsistencies

These are documented here so you don't waste time "discovering" them or trying to fix them without context.

1. **Asset type is duplicated.** The `Asset` interface is copy-pasted in `highlights/page.tsx`, `photos/page.tsx`, `videos/page.tsx`, `selected/page.tsx`, `albums/[slug]/page.tsx`. There is no shared types file yet. If you add a field, you must update all of them (or extract a shared type to `src/types/asset.ts`).

2. **StorageProvider is dead code.** `src/lib/storage/localStorageProvider.ts` exists and implements the `StorageProvider` interface, but nothing imports it. All API routes hardcode URL construction inline: `/api/media/${id}/thumbnail`. The abstraction is ready for when we add cloud providers, but isn't wired up yet.

3. **Albums page does HTTP self-fetch.** `src/app/albums/page.tsx` is a server component that fetches from its own API via `fetch('http://localhost:3000/api/albums')`. This should use Prisma directly but works for now.

4. **photoCount/videoCount are always 0.** `GET /api/albums` returns `photoCount: 0, videoCount: 0` — only `totalCount` is populated. Documented in `docs/API.md`.

5. **Admin stats makes 4 API calls.** `src/app/admin/page.tsx` fetches `/api/assets?limit=1` four times with different filters to get counts. Should be a single admin stats API endpoint.

6. **No shared error boundary.** No React error boundaries exist yet.

## Key file locations

| Thing | File |
|---|---|
| Prisma client singleton | `src/lib/db.ts` |
| Prisma schema (5 models) | `prisma/schema.prisma` |
| Prisma 7 datasource config | `prisma.config.ts` |
| Middleware (auth check) | `src/middleware.ts` |
| Auth API route | `src/app/api/auth/guest-password/route.ts` |
| Assets API (paginated, filterable) | `src/app/api/assets/route.ts` |
| Media file serving | `src/app/api/media/[id]/{download,preview,thumbnail}/route.ts` |
| StorageProvider interface | `src/lib/storage/types.ts` |
| Local storage provider (unused) | `src/lib/storage/localStorageProvider.ts` |
| Import script | `scripts/import-media.ts` |
| Thumbnail regenerator | `scripts/generate-thumbnails.ts` |
| DB + thumbnails reset | `scripts/reset-local.ts` |
| Favorites logic (localStorage) | `src/components/FavoriteButton.tsx` |
| Media lightbox | `src/components/MediaViewerModal.tsx` |
| UI primitives (hand-built Radix) | `src/components/ui/*.tsx` |
| Design tokens (CSS vars, fonts) | `src/app/globals.css` |

## Module boundaries

When editing these areas, limit your changes to the listed files:

**Auth system:** `src/middleware.ts`, `src/app/api/auth/guest-password/route.ts`, `src/app/auth/page.tsx`

**Media serving:** `src/app/api/media/[id]/download/route.ts`, `preview/route.ts`, `thumbnail/route.ts`

**Import pipeline:** `scripts/import-media.ts`, `scripts/generate-thumbnails.ts`, `scripts/reset-local.ts`

**Gallery pages:** `src/app/highlights/page.tsx`, `src/app/photos/page.tsx`, `src/app/videos/page.tsx`, `src/app/albums/page.tsx`, `src/app/albums/[slug]/page.tsx`

**Selected/Favorites:** `src/components/FavoriteButton.tsx`, `src/app/selected/page.tsx` — localStorage key is `wedding-gallery-selected-assets`

**Design:** `src/app/globals.css` (CSS vars, fonts, masonry grid), `tailwind.config.ts` if it exists

**Navigation:** `src/components/TopNav.tsx` — nav links are hardcoded in `navLinks` array

## What NOT to add without discussion

- Cloud storage (Cloudinary, S3, Supabase Storage)
- Supabase backend or authentication
- Vercel deployment config
- Face recognition logic (schema placeholder exists, no feature)
- Guest uploads
- Landing page
- SaaS/multi-tenant patterns
