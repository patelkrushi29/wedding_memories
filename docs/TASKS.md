# Task Tracker

**Purpose:** Start every new Claude Code session by reading this file + CLAUDE.md. This tells you exactly what's done, what's next, and what to work on.

**Last updated:** 2026-05-30, Session 1

---

## How to use this file

1. Read the "Current Status" section to understand where the project is
2. Look at "Next Up" for the immediate task to work on
3. After completing a task, move it from "Next Up" to "Completed" with the date
4. If you make a decision, add it to `docs/CHANGELOG.md` and `docs/DECISIONS.md`
5. If you find a bug, add it to "Known Bugs" below

---

## Current Status

**Version:** 0.1 local MVP
**Phase:** Stabilization (fixing bugs and tech debt before real testing)
**The app runs:** Yes — `npm run dev` works, all pages load, import works, auth works
**Ready for owner testing:** Almost — need to fix remaining stabilization items first

---

## Completed

| Task | Date | Notes |
|---|---|---|
| Initial Next.js + Prisma + Tailwind setup | 2026-05-30 | Commit `888982d` |
| Full MVP: 10 pages, 8 API routes, 9 components | 2026-05-30 | Commit `c983183` |
| Documentation system (12 doc files) | 2026-05-30 | Commits `63f864d` through `f9ad5f4` |
| S1 partial: Smoke test — app runs, pages load, import works | 2026-05-30 | All pages 200, API returns correct data |
| Bug fix: Import script Prisma 7 crash | 2026-05-30 | Created `scripts/db.ts` with libsql adapter |
| Bug fix: CSS @import ordering crash | 2026-05-30 | Migrated to `next/font` (Playfair Display + Inter) |
| Bug fix: originalPath leaked in API responses | 2026-05-30 | Stripped from assets and album detail responses |

---

## Next Up (Stabilization Phase)

Work on these in order. Each is independent — you can do one per session if needed.

### S2: Extract shared Asset types
**Files:** Create `src/types/asset.ts`, update all pages and components that define their own Asset interface
**Why:** Asset interface is copy-pasted in 8 files. Adding a field means editing all of them.
**Effort:** Small (30 min)
**How:** See `docs/WORKFLOWS.md` → "Adding a new page" for the import pattern

### S3: Fix photoCount/videoCount in albums API
**File:** `src/app/api/albums/route.ts`
**Why:** Returns `photoCount: 0, videoCount: 0` — only `totalCount` works
**Effort:** Small (15 min)
**How:** Count assets grouped by type in the Prisma query

### S4: Fix albums page self-fetch
**File:** `src/app/albums/page.tsx`
**Why:** Server component fetches `http://localhost:3000/api/albums` via HTTP instead of using Prisma directly
**Effort:** Small (20 min)
**How:** Import `prisma` from `@/lib/db`, query directly, remove the HTTP fetch

### S5: Add admin stats API endpoint
**Files:** Create `src/app/api/admin/stats/route.ts`, update `src/app/admin/page.tsx`
**Why:** Admin page makes 4 separate API calls to get counts
**Effort:** Small (20 min)

### S6: Wire up StorageProvider (or centralize URL construction)
**Files:** `src/lib/storage/localStorageProvider.ts`, API routes that construct URLs
**Why:** Dead code — the abstraction exists but nothing uses it
**Effort:** Medium (45 min)
**Decision needed:** Wire up the full provider pattern, or just extract URL construction to a helper function?

---

## Backlog (Polish Phase — after stabilization)

| Task | Priority | Effort | Notes |
|---|---|---|---|
| P1: Rewrite README for non-technical owner | High | Medium | Current README is developer-focused |
| P2: Add video duration extraction to import | Medium | Small | Needs ffprobe, graceful fallback |
| P3: Add search/filter to album detail page | Medium | Small | Album detail has no FilterBar |
| P4: Mobile viewport testing and fixes | High | Medium | Not verified yet |
| P5: Error boundaries (error.tsx files) | Medium | Small | No error handling for component crashes |
| P6: Toast notifications for actions | Low | Small | Toast component exists but unused |

---

## Known Bugs

| Bug | Severity | Status |
|---|---|---|
| photoCount/videoCount always 0 in albums API | Medium | Planned fix (S3) |
| Albums page HTTP self-fetch to localhost:3000 | Medium | Planned fix (S4) |
| Admin page makes 4 API calls for counts | Low | Planned fix (S5) |
| StorageProvider is dead code | Low | Planned fix (S6) |
| No error boundaries anywhere | Low | Planned fix (P5) |
| Middleware deprecation warning (Next.js 16 "proxy" convention) | Info | Not blocking, monitor |

---

## Session Handoff Instructions

When starting a new session:

1. Read `CLAUDE.md` (the operating manual — critical rules, Prisma 7 gotchas, module boundaries)
2. Read this file (`docs/TASKS.md`) — tells you what's done and what's next
3. Pick the first task under "Next Up"
4. Read the specific doc file referenced in the task
5. Follow the recipe in `docs/WORKFLOWS.md` if applicable
6. After completing: move the task to "Completed", update docs, commit, push
7. Add a new entry to `docs/CHANGELOG.md`
