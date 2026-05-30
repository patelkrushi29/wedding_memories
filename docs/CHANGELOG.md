# Changelog & Decision Log

Chronological record of every session's work, decisions made, and code changes. Newest entries at the top.

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
