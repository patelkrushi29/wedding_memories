# Wedding Memories — Claude Code Operating Manual

A self-hosted wedding photo/video gallery. Local-first MVP: Next.js + SQLite + Prisma, no cloud services.

**Current version:** 0.1 (local MVP — stabilization phase)

---

## How to use this documentation

This file is the entry point. Read it fully on every session. Then load ONLY the doc file relevant to your task.

### For understanding and planning
| Need | Read |
|---|---|
| What to work on next | `docs/PLAN.md` → Stabilization Phase |
| Why something was built this way | `docs/DECISIONS.md` |
| Full directory map and data flow | `docs/ARCHITECTURE.md` |
| What's planned long-term | `docs/ROADMAP.md` |

### For implementation
| Task | Read |
|---|---|
| Adding a page, component, or API route | `docs/WORKFLOWS.md` → the specific recipe |
| Code patterns and naming rules | `docs/CONVENTIONS.md` |
| DB schema, Prisma setup, migrations | `docs/DATABASE.md` |
| Auth, cookies, middleware | `docs/AUTH.md` |
| Import script, folders, thumbnails | `docs/MEDIA-IMPORT.md` |
| API routes, params, responses | `docs/API.md` |
| Pages and components, props, state | `docs/COMPONENTS.md` |
| StorageProvider interface | `docs/STORAGE.md` |

### For verification
| Need | Read |
|---|---|
| How to test a change | `docs/TESTING.md` → relevant checklist |
| Version milestone checklist | `docs/WORKFLOWS.md` → "Preparing for a version milestone" |

---

## Critical rules (always apply)

### Security
- **Never accept raw file paths from the client** — only asset IDs. Server resolves paths from DB.
- **Never expose `asset.originalPath`** in any API response.
- Auth cookie: `wg-auth=authenticated`, set httpOnly by `POST /api/auth/guest-password`.

### Performance
- **Never load original images in grids** — always use `/api/media/[id]/thumbnail`.
- **Never query all assets at once** — always paginate with `skip`/`take`, default limit 60.
- **Always include `isHidden: false, isAvailable: true`** in guest-facing queries.
- Videos use `preload="metadata"` only.

### Data integrity
- `Asset.type` is a plain String (`"PHOTO"` or `"VIDEO"`), not a Prisma enum. SQLite has no native enums.
- `media/` and `public/generated/` are gitignored. Never commit media or thumbnails.
- Database file is `prisma/dev.db` (also gitignored).
- Shared types live in `src/types/` — do NOT define local Asset interfaces in page files.
- URL construction (`/api/media/[id]/thumbnail`, etc.) happens server-side in API routes, never on the client.

---

## Prisma 7 — read before touching anything DB-related

This project uses Prisma 7 with the libsql adapter. **Standard Prisma tutorials will mislead you.**

| What's different | Detail |
|---|---|
| No `url` in schema.prisma | URL lives in `prisma.config.ts` via `defineConfig()` |
| Driver adapter required | `@prisma/adapter-libsql` with `PrismaLibSql({ url })` |
| Relative paths rejected | `src/lib/db.ts` has `resolveDbUrl()` to convert `file:./dev.db` → `file:///abs/path/dev.db` |
| Type cast needed | `new PrismaClient({ adapter } as any)` — intentional, do not remove |
| Scripts use raw PrismaClient | `scripts/*.ts` use `new PrismaClient()` without adapter — works because Prisma 7 reads URL from `prisma.config.ts` |

If you change DB connection logic, update BOTH `src/lib/db.ts` AND the scripts.

---

## Known tech debt

These are documented so you don't waste time discovering them. Fix them as part of the Stabilization Phase (see `docs/PLAN.md`).

| # | Issue | Where | How to fix |
|---|---|---|---|
| 1 | Asset interface duplicated in 8 files | All page files + MediaCard, VideoCard, MediaViewerModal | Extract to `src/types/asset.ts` |
| 2 | StorageProvider is dead code | `src/lib/storage/localStorageProvider.ts` never imported | Wire up or centralize URL construction |
| 3 | Albums page does HTTP self-fetch | `src/app/albums/page.tsx` fetches `localhost:3000/api/albums` | Replace with direct Prisma query |
| 4 | photoCount/videoCount always 0 | `GET /api/albums` returns hardcoded 0 | Fix the query to count by type |
| 5 | Admin page makes 4 API calls for counts | `src/app/admin/page.tsx` | Create `GET /api/admin/stats` |
| 6 | No error boundaries | Entire app | Add error.tsx files per route |
| 7 | Google Fonts via CSS @import | `src/app/globals.css` | Migrate to `next/font` |

---

## Module boundaries

When editing an area, limit changes to these files:

**Auth:** `src/middleware.ts`, `src/app/api/auth/guest-password/route.ts`, `src/app/auth/page.tsx`

**Media serving:** `src/app/api/media/[id]/download/route.ts`, `preview/route.ts`, `thumbnail/route.ts`

**Import pipeline:** `scripts/import-media.ts`, `scripts/generate-thumbnails.ts`, `scripts/reset-local.ts`

**Gallery pages:** `src/app/highlights/page.tsx`, `photos/page.tsx`, `videos/page.tsx`, `albums/page.tsx`, `albums/[slug]/page.tsx`

**Selected/Favorites:** `src/components/FavoriteButton.tsx`, `src/app/selected/page.tsx` — localStorage key: `wedding-gallery-selected-assets`

**Design system:** `src/app/globals.css` (CSS vars, fonts, masonry), component-level Tailwind classes

**Navigation:** `src/components/TopNav.tsx` — nav links in `navLinks` array

---

## Key file locations

| Thing | File |
|---|---|
| Prisma client singleton | `src/lib/db.ts` |
| Prisma schema (5 models) | `prisma/schema.prisma` |
| Prisma 7 datasource config | `prisma.config.ts` |
| Middleware (auth check) | `src/middleware.ts` |
| Auth API | `src/app/api/auth/guest-password/route.ts` |
| Assets API (paginated) | `src/app/api/assets/route.ts` |
| Albums API | `src/app/api/albums/route.ts` |
| Media file endpoints | `src/app/api/media/[id]/{download,preview,thumbnail}/route.ts` |
| Admin reindex | `src/app/api/admin/reindex/route.ts` |
| StorageProvider interface | `src/lib/storage/types.ts` |
| Import script | `scripts/import-media.ts` |
| Thumbnail regenerator | `scripts/generate-thumbnails.ts` |
| DB + thumbnails reset | `scripts/reset-local.ts` |
| Favorites (localStorage) | `src/components/FavoriteButton.tsx` |
| Media lightbox | `src/components/MediaViewerModal.tsx` |
| UI primitives (Radix) | `src/components/ui/*.tsx` |
| Design tokens | `src/app/globals.css` |
| Shared types | `src/types/` (to be created in stabilization) |
| Utility functions | `src/lib/utils.ts` |

---

## What NOT to add without explicit instruction

- Cloud storage (Cloudinary, S3, Supabase Storage)
- Supabase backend or authentication
- Vercel deployment configuration
- Face recognition logic (schema placeholder exists, feature is v0.5)
- Guest uploads
- Landing page (first experience is the gallery)
- SaaS / multi-tenant patterns
- Email sharing, watermarking, access expiry
- Third-party analytics

---

## After every task

1. Run `npm run dev` and verify the change works
2. Run the relevant checklist from `docs/TESTING.md`
3. If you made a non-obvious technical decision, add it to `docs/DECISIONS.md`
4. Update the relevant doc file if behavior changed
5. Update `docs/PLAN.md` if you completed a planned task
