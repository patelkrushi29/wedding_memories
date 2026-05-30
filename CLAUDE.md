# Wedding Memories — Claude Code Operating Manual

A password-gated wedding photo/video gallery. **Target production:** Next.js on Vercel, **PostgreSQL** (Supabase/Neon), **Cloudflare R2** + CDN. Owner imports media; guests browse only.

**Current version:** 0.1 (app MVP built; **cloud stack not wired in code yet**)

**Go live:** Read `docs/DEPLOY.md` first. **Do not** plan on SQLite → Postgres migration; new DB/storage work targets **Postgres + R2 from day one**.

---

## How to use this documentation

This file is the entry point. Read it fully on every session. Then load ONLY the doc file relevant to your task.

### For session handoff (start here if new session)
| Need | Read |
|---|---|
| What's done, what's next, pick a task | `docs/TASKS.md` |
| Chronological history of all work | `docs/CHANGELOG.md` |

### For understanding and planning
| Need | Read |
|---|---|
| Full gap analysis and phase plan | `docs/PLAN.md` |
| **Going live (accounts, R2, Postgres, domain)** | **`docs/DEPLOY.md`** |
| Why something was built this way | `docs/DECISIONS.md` |
| Full directory map and data flow | `docs/ARCHITECTURE.md` |
| What's planned long-term | `docs/ROADMAP.md` |

### For implementation
| Task | Read |
|---|---|
| Adding a page, component, or API route | `docs/WORKFLOWS.md` → the specific recipe |
| Code patterns and naming rules | `docs/CONVENTIONS.md` |
| DB schema, Prisma setup, migrations | `docs/DATABASE.md` |
| Auth, cookies, proxy | `docs/AUTH.md` |
| Import script, folders, thumbnails | `docs/MEDIA-IMPORT.md` |
| API routes, params, responses | `docs/API.md` |
| Pages and components, props, state | `docs/COMPONENTS.md` |
| StorageProvider interface | `docs/STORAGE.md` |

### For verification
| Need | Read |
|---|---|
| How to test a change | `docs/TESTING.md` → relevant checklist |
| Version milestone checklist | `docs/WORKFLOWS.md` → "Preparing for a version milestone" |

### Claude Code layout (`.claude/`)
| Path | Purpose |
|---|---|
| `.claude/rules/` | Short rules when editing `api/`, `components/`, `prisma/`, `scripts/` |
| `.claude/skills/` | `import-media`, `smoke-test` |
| `.claude/commands/` | `/status`, `/test`, `/import`, `/ship`, etc. |
| `.claude/hooks/` | SessionStart, PreCompact, PostToolUse |
| `CLAUDE.local.md` | Personal overrides (gitignored) |
| `mcp.json` | MCP servers (empty by default) |

---

## Critical rules (always apply)

### Security
- **Never accept raw file paths from the client** — only asset IDs. Server resolves paths/keys from DB.
- **Never expose `asset.originalPath`** (or R2 internal keys) in any API response.
- Auth cookie: `wg-auth=authenticated`, set httpOnly by `POST /api/auth/guest-password`.
- Production: **family view link** via `FAMILY_VIEW_TOKEN` (see `docs/AUTH.md`, `docs/DEPLOY.md`).

### Performance
- **Never load original images in grids** — thumbnails only (API or CDN URL).
- **Never query all assets at once** — paginate with `skip`/`take`, default limit 60.
- **Always include `isHidden: false, isAvailable: true`** in guest-facing queries.
- Videos use `preload="metadata"` only.
- **Long videos:** serve from **R2/CDN**, not Vercel API byte-streaming at scale.

### Data integrity
- `Asset.type` is a plain String (`"PHOTO"` or `"VIDEO"`). Use enum only after Postgres migration if desired.
- `media/` and `public/generated/` are gitignored until R2 import is complete.
- Shared types live in `src/types/` — do NOT define local Asset interfaces in page files.
- URL construction happens server-side in API routes or StorageProvider, never on the client.

---

## Database — target vs current code

| | Target (production) | Current code (legacy dev) |
|--|---------------------|---------------------------|
| Engine | **PostgreSQL** | SQLite |
| Connection | `DATABASE_URL` from Supabase/Neon | `file:./dev.db` + libsql adapter |
| Client | Standard `PrismaClient` | `@prisma/adapter-libsql` in `src/lib/db.ts`, `scripts/db.ts` |

**New work:** implement Postgres per `docs/DEPLOY.md` C1. Do not add features that assume SQLite long-term.

**Prisma 7 (current SQLite path only):** URL in `prisma.config.ts`; libsql needs absolute `file:///` URLs — `pathToFileURL()` in `db.ts`. Scripts import `prisma` from `scripts/db.ts`.

When Postgres lands: remove libsql adapter, update `docs/DATABASE.md`, run `prisma migrate deploy` on cloud DB.

---

## Known tech debt

See `docs/PLAN.md` and `docs/TASKS.md`. Highlights:

| # | Issue | Where | How to fix |
|---|---|---|---|
| 1 | Asset interface duplicated in 8 files | Pages + MediaCard, VideoCard, MediaViewerModal | `src/types/asset.ts` (S2) |
| 2 | StorageProvider not wired | `localStorageProvider.ts` | R2 provider + S6 |
| 3 | Albums page HTTP self-fetch | `albums/page.tsx` | Direct Prisma (S4) |
| 4 | photoCount/videoCount always 0 | `api/albums/route.ts` | S3 |
| 5 | Admin page 4 API calls | `admin/page.tsx` | `GET /api/admin/stats` (S5) |
| 6 | No error boundaries | App routes | `error.tsx` (P6) |
| 7 | **SQLite + local disk** | Whole stack | **C1–C3** in DEPLOY.md (cloud-first) |
| 8 | No family view link | Auth | C5 in DEPLOY.md |

---

## Module boundaries

When editing an area, limit changes to these files:

**Auth:** `src/proxy.ts`, `src/app/api/auth/guest-password/route.ts`, `src/app/auth/page.tsx` (+ future family view route)

**Media serving:** `src/app/api/media/[id]/download/route.ts`, `preview/route.ts`, `thumbnail/route.ts` (shrink when R2 CDN URLs used in UI)

**Import pipeline:** `scripts/import-media.ts`, `scripts/generate-thumbnails.ts`, `scripts/reset-local.ts`, `scripts/db.ts`

**Gallery pages:** `src/app/highlights/page.tsx`, `photos/page.tsx`, `videos/page.tsx`, `albums/page.tsx`, `albums/[slug]/page.tsx`

**Selected/Favorites:** `src/components/FavoriteButton.tsx`, `src/app/selected/page.tsx` — localStorage key: `wedding-gallery-selected-assets`

**Design system:** `src/app/globals.css`, `src/app/layout.tsx` (next/font), component Tailwind

**Navigation:** `src/components/TopNav.tsx` — `navLinks` array

**Cloud storage:** `src/lib/storage/*` — implement R2 per `docs/STORAGE.md`

---

## Key file locations

| Thing | File |
|---|---|
| Prisma client singleton | `src/lib/db.ts` |
| Prisma schema (5 models) | `prisma/schema.prisma` |
| Prisma 7 config | `prisma.config.ts` |
| Auth proxy | `src/proxy.ts` |
| Auth API | `src/app/api/auth/guest-password/route.ts` |
| Assets API | `src/app/api/assets/route.ts` |
| Albums API | `src/app/api/albums/route.ts` |
| Media endpoints | `src/app/api/media/[id]/{download,preview,thumbnail}/route.ts` |
| Admin reindex | `src/app/api/admin/reindex/route.ts` |
| StorageProvider | `src/lib/storage/types.ts`, `localStorageProvider.ts` → **R2 TBD** |
| Import script | `scripts/import-media.ts` |
| Scripts DB client | `scripts/db.ts` |
| Deployment guide | **`docs/DEPLOY.md`** |

---

## What NOT to add without explicit instruction

- MongoDB or non-Postgres primary database
- Cloudinary as default storage (see DEPLOY — R2 preferred)
- Guest uploads (phase 2+)
- Face recognition logic (v0.5 — schema placeholder exists)
- Landing page (first experience after auth is `/highlights`)
- SaaS / multi-tenant patterns
- Email sharing, watermarking, access expiry
- Third-party analytics

**Allowed and expected for go-live:** Vercel, Supabase/Neon Postgres, Cloudflare R2 — see `docs/DEPLOY.md`.

---

## After every task

1. Run `npm run dev` and verify the change works (or test against cloud `DATABASE_URL` when C1 is done)
2. Run the relevant checklist from `docs/TESTING.md`
3. Non-obvious decisions → `docs/DECISIONS.md`
4. Behavior changes → update the relevant doc
5. Phase completion → `docs/PLAN.md`, `docs/TASKS.md`, `docs/CHANGELOG.md`
