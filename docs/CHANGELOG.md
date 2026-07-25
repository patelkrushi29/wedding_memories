# Changelog & Decision Log

Chronological record of every session's work, decisions made, and code changes. Newest entries at the top.

---

## Session 7 — 2026-07-25 — Darkroom redesign, day → function spine

### What was done

Redesigned the guest experience against the round-2 Darkroom frames, replacing the warm-white/gold
system and the feed-shaped IA.

- **Design system:** dark photographic palette (ink/plate/veil/paper/ash/dim + a single halide
  accent), three fonts with distinct roles (Newsreader display, Instrument Sans UI, IBM Plex Mono
  labels), film grain and sprocket motifs. New PWA icons and theme colour.
- **IA:** three tabs — The days / People / Saved. Home is day headings with function cards weighted
  by photo count; `/functions/[slug]` is the gallery with photo/film lanes. Removed the feed,
  albums, highlights, events, videos and photos pages along with 6 now-unused components.
- **Schema:** `Tag` gained a self-relation so DAY contains FUNCTION; existing EVENT rows migrated to
  FUNCTION. `Asset` gained `viewerPath`, `source`, `uploaderName`.
- **Three image tiers** (delivery notes §4): grid 600px, viewer 1600px, original only for
  zoom/download. Previously every swipe pulled the full original.
- **Host page** rewritten: functions grouped under their day, rename inline, publish/hide, delete.
- Error boundary and not-found pages, so a broken gallery no longer looks like an empty one.
- Diagnostics: `prune-missing`, `list-bucket`, `audit-thumbnails`, `progress`, `inspect-originals`.

### Decisions made

| # | Decision | Why |
|---|---|---|
| D15 | Single wedding, product-quality design | Owner wants to launch their own gallery; multi-tenant can be migrated later if it becomes a product. |
| D16 | "That's me" face claiming, stored on the device | Cheapest possible identity: no biometrics, reversible, and it unlocks the recap and every "N of you" counter. |
| D17 | Guest uploads deferred | Browsing, faces and facets first; uploads need resumable transfer plus a moderation queue. |
| D18 | Outfit signals in the pipeline, never in the UI | Useful for re-identification across days and function boundaries; nobody browses by "red lehenga". |
| D19 | Facet sheet deferred until derived facets exist | A sheet whose only options duplicate the existing chips is not worth shipping. |
| D20 | Derived R2 keys are `<assetId>`-based | Simple and collision-free, but it means re-uploading originals invalidates every derived file — hence `prune-missing`. |

### Bugs found

| Bug | Status |
|---|---|
| Every thumbnail 404'd — the bucket's `thumbnails/` prefix had been deleted and `media/` re-uploaded under new keys | Fixed: `prune-missing` removed 59 orphaned rows plus the emptied function/day, then `sync:r2` rebuilt all tiers |
| Viewer served full-resolution originals on every swipe | Fixed by the viewer tier |
| `.claude/rules/*` still described the old gold/white system, SQLite, and deleted scripts | Rewritten |
| Uploaded "originals" are 1024px, ~200 KB, with **no EXIF** — they are the old app's resized derivatives, not camera files | Open — blocks real day/function detection and limits image quality; owner needs to upload camera originals |

---

## Session 4 — 2026-05-30 — R2-only catalog sync

### What was done

- `npm run sync:r2` indexes objects already in R2 `media/` into Postgres (no local `media/wedding`)
- R2 list/download/head helpers; README and MEDIA-IMPORT updated for R2-first workflow

---

## Session 3 — 2026-05-30 — Supabase Postgres + Cloudflare R2

### What was done

- **C1:** PostgreSQL via Supabase (`@prisma/adapter-pg`), removed SQLite/libsql
- **C2/C3:** R2 upload on import, CDN URLs in API (`attachMediaUrls`)
- `next.config.ts` remote images for `*.r2.dev`
- Updated `.env.example`, `docs/TASKS.md`

---

## Session 2 (continued) — 2026-05-30 — Unified baseline on `main`

### What was done

- Squashed Cursor docs + Claude Code `.claude/` structure into one commit on **`main`**: `259e2bb`
- Pushed `origin/main`; aligned `claude/serene-darwin-wegA5` to the same commit
- **Use `main` for all new work** going forward

---

## Session 2 (continued) — 2026-05-30 — Merge .claude structure + align rules

### What was done

- Merged remote `.claude/` (hooks, skills, agents, commands, rules), `mcp.json`, `CLAUDE.local.md` gitignore
- Aligned `.claude/rules/` and SessionStart with cloud-first docs (`DEPLOY.md`, Postgres, R2)
- Added `CLAUDE.local.md.example`, `.claude/` index in `CLAUDE.md`
- Pushed unified branch `claude/serene-darwin-wegA5`

---

## Session 2 — 2026-05-30 — Cloud-first production documentation

### What was done

- Added **`docs/DEPLOY.md`** — full go-live guide (Vercel, Postgres, R2, accounts, env vars, C1–C6 checklist)
- Reoriented plan/roadmap/tasks for **Postgres + R2 from day one** (no SQLite production path)
- Owner requirements captured: ~10k photos, long videos, family link, custom domain, no guest uploads in phase 1
- Fixed stale docs: `proxy.ts`, `next/font`, `scripts/db.ts`, Windows `pathToFileURL` note in DATABASE
- New decisions D15–D18 in `DECISIONS.md`
- Updated `CLAUDE.md`, `README.md`, `.env.example`, `AUTH`, `STORAGE`, `ARCHITECTURE`, `DATABASE`, `MEDIA-IMPORT`, `WORKFLOWS`, `CONVENTIONS`

### Not done (code — next sessions)

- C1–C6 implementation (schema still SQLite in repo)
- Family view route
- R2 provider

---

## Session 1 — 2026-05-30 — Initial Build + Docs + Bug Fixes

### What was done

Built the entire Wedding Memories Gallery local MVP from scratch in an empty repo. Created comprehensive documentation system (14 files) for Claude Code session handoff. Found and fixed 3 bugs during smoke testing. Captured screenshots of all pages for owner review.

### Commits (chronological)

1. `888982d` — **Initial commit: wedding memories Next.js project setup**
   - `npx create-next-app` with TypeScript, Tailwind, ESLint, App Router
   - Basic project scaffold

2. `c983183` — **Add Wedding Memories Gallery MVP**
   - Complete application: 55 files total
   - Prisma schema: 5 models (Album, Asset, SiteSetting, FuturePerson, FutureFaceMatch)
   - 8 API routes (auth, albums, assets, media serving, admin reindex)
   - 10 pages (auth, highlights, photos, videos, albums, album detail, selected, find-yourself, admin, root redirect)
   - 9 components (TopNav, MediaCard, VideoCard, AlbumCard, MediaViewerModal, FavoriteButton, FilterBar, EmptyState, LoadingGrid)
   - 8 UI primitives (button, badge, card, dialog, dropdown-menu, input, skeleton, toast)
   - 3 scripts (import-media, generate-thumbnails, reset-local)
   - Storage abstraction (types + localStorageProvider)
   - Middleware auth (cookie check)

3. `63f864d` — **Add partial docs-as-context system (in progress)**
   - ARCHITECTURE.md, AUTH.md, DATABASE.md

4. `6d791b7` — **Add docs-as-context system**
   - API.md, COMPONENTS.md, MEDIA-IMPORT.md, STORAGE.md, ROADMAP.md

5. `5e1ef76` — **Rewrite CLAUDE.md as operating manual, add DECISIONS.md**
   - CLAUDE.md rewritten with Prisma 7 gotchas, tech debt inventory, module boundaries
   - DECISIONS.md with 14 documented decisions (D1-D14)

6. `f9ad5f4` — **Add project plan, workflows, conventions, and testing docs**
   - PLAN.md: gap analysis, 6-phase plan
   - WORKFLOWS.md: step-by-step recipes
   - CONVENTIONS.md: code patterns and rules
   - TESTING.md: verification checklists

### Decisions made (chronological)

| # | Decision | Why | See |
|---|---|---|---|
| D1 | Prisma 7 + libsql adapter | Latest Prisma at build time; required adapter pattern | DECISIONS.md |
| D2 | Asset.type as String not enum | SQLite has no native enums | DECISIONS.md |
| D3 | Hand-built UI primitives | shadcn CLI registry unreachable | DECISIONS.md |
| D4 | Cookie auth (plaintext) | Local prototype, not production | DECISIONS.md |
| D5 | All /api/* skips auth | Media serving needs to work in img/video tags | DECISIONS.md |
| D6 | Thumbnails served through API | Enables fallback placeholder SVG | DECISIONS.md |
| D7 | Asset type duplicated per file | Unintentional tech debt, flagged for fix | DECISIONS.md |
| D8 | StorageProvider not wired up | Abstraction ready but no benefit locally yet | DECISIONS.md |
| D9 | Albums from folder names | Matches owner's Google Drive structure | DECISIONS.md |
| D10 | Import marks all unavailable first | Detects deleted files | DECISIONS.md |
| D11 | Albums page HTTP self-fetch | Quick initial build, flagged for fix | DECISIONS.md |
| D12 | Google Fonts via CSS @import | Simple, but caused CSS ordering bug | DECISIONS.md |
| D13 | Video poster in both fields | thumbnailPath needed for grid display | DECISIONS.md |
| D14 | .gitignore /media/ anchored | Unanchored pattern blocked API routes | DECISIONS.md |

### Bugs found during session

| Bug | Status |
|---|---|
| Import script crashes: `new PrismaClient()` without adapter fails on Prisma 7 | Fixed — created `scripts/db.ts` shared client |
| CSS @import ordering: Google Fonts @import after Tailwind causes parse error | Fixed — migrated to `next/font` |
| originalPath leaked in API responses | Fixed — stripped from assets and album detail responses |
| photoCount/videoCount always 0 in albums API | Documented, not yet fixed |
| Albums page HTTP self-fetch to localhost:3000 | Documented, not yet fixed |

### Additional commits (bug fixes + docs)

7. `ab1f39f` — **Fix 3 bugs, add session handoff docs**
   - Created `scripts/db.ts`: shared Prisma client with libsql adapter for all scripts
   - Updated all 3 scripts to import from `./db` instead of creating raw `new PrismaClient()`
   - Migrated fonts from CSS `@import` to `next/font` in `layout.tsx`
   - Stripped `originalPath`, `thumbnailPath`, `posterPath` from API responses (security fix)
   - Added `docs/CHANGELOG.md` (this file) and `docs/TASKS.md` (session handoff tracker)
   - Updated `CLAUDE.md` with session handoff section

### Test results

- Import: 8 test photos across 3 albums, all imported successfully
- All 10 pages return HTTP 200
- Thumbnails generated (490 bytes webp vs 8728 bytes original)
- Download endpoint streams original file correctly
- Auth flow works (password → cookie → access)
- 12 screenshots captured (desktop + mobile) — all pages render correctly
- Owner confirmed Codespace is working

---

## Template for future sessions

Copy this template to add a new session entry at the top of this file:

```markdown
## Session N — YYYY-MM-DD — [Description]

### What was done
[1-3 sentence summary]

### Commits (chronological)
- `<hash>` — **<message>**: [what changed]

### Decisions made
| # | Decision | Why |
|---|---|---|

### Bugs found
| Bug | Status |
|---|---|---|

### Test results
[What was tested and the outcome]
```
