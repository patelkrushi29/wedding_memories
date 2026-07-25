# Wedding Memories — Claude Code Operating Manual

A private, password-gated wedding gallery. **Live:** Next.js on Vercel + **Supabase Postgres** +
**Cloudflare R2**. The couple imports the media; guests browse.

**Current version:** 0.3 — cloud stack live, Darkroom redesign, day → function spine.

| Need | Read |
|---|---|
| What to do next, and what's blocked on the owner | `docs/TASKS.md` |
| The phase plan and the backlog | `docs/PLAN.md` |
| What happened, and why | `docs/CHANGELOG.md` · `docs/DECISIONS.md` |
| Deploying, env vars, the Vercel gotchas | `docs/DEPLOY.md` |
| Rules for the code you're touching | `.claude/rules/*` (loads automatically) |

Other files in `docs/` predate the redesign and describe deleted code — see the doc-debt note in
`docs/TASKS.md`.

---

## Product decisions that shape everything

Settled 2026-07-25 with the owner. Do not quietly reverse these.

| Decision | Consequence |
|---|---|
| **One wedding, product quality** | Single-tenant schema (no Wedding root entity, no host accounts) but the design and polish are held to product standard. |
| **No feed, no comments, no like counts, no profiles** | The heart is a *private* save marker on the visitor's own device. Nothing a guest does is broadcast to another guest. |
| **Face wall before selfie** | Guests find themselves by tapping a face, which needs no biometric consent. A selfie is the escape hatch, never the toll gate. |
| **"That's me" claiming** | A visitor taps their own face once; it lives in localStorage. That is the entire identity model — it unlocks "N of you" counters and the per-guest recap. |
| **Guest uploads deferred** | No "Add" tab yet. Browsing, faces, and facets first. |
| **Outfits in the pipeline, never in the UI** | Clothing embeddings help re-identify people across days and detect function boundaries. There is no "red lehenga" filter. |

---

## Information architecture

Three tabs. **Days contain functions** — that hierarchy is the spine of the app.

```
/                     The days   — day headings, function cards weighted by photo count
/functions/[slug]     One function — grid + photo/film lanes, in-place viewer
/people               The face wall (awaiting the face pipeline)
/saved                Private saves, this device only
/auth                 Password gate
/admin                Host: name and publish functions
```

Video is a **filter inside a function**, never its own tab. There is no albums page, no
highlights page, no feed — those were removed in the redesign.

---

## Design system — "Darkroom"

Dark, photographic, one accent. Full token list and type roles: `.claude/rules/components.md`.

- Surfaces `--ink #15100D` → `--plate #1F1815`, hairlines `--veil #2E2622`
- Text `--paper #F6EFE6` → `--ash #A39287` → `--dim #6E625B`
- Accent `--halide #7ECFC2` only (the old gold `#c9a96e` is gone)
- **Newsreader** 300/italic for display, **Instrument Sans** for UI, **IBM Plex Mono** uppercase
  for labels and counts
- Film grain over imagery (`.grain`), sprocket rails on strips (`.sprockets`)

---

## Critical rules

### Security
- Never accept a raw file path from the client — only asset ids. The server resolves keys.
- Never expose `originalPath` / `thumbnailPath` / `viewerPath` / `posterPath`. Use
  `attachMediaUrls()`.
- Auth cookie `wg-auth=authenticated`, httpOnly, Secure in production.
- Admin routes use `isAdminAuthorized()` and refuse the placeholder secret `change-me`.

### Delivery
- **Three image tiers.** Grid → `thumbnailUrl` (600px). Viewer → `previewUrl` (1600px).
  Full res → `fullUrl`, only on a deliberate zoom or download. Never serve an original to a grid
  or a swipe.
- Never query all assets; cursor-paginate, default 60.
- Always filter `isHidden: false, isAvailable: true`, and `tag.isVisible` for tag queries.
- Videos `preload="metadata"`, served from R2, never proxied through a serverless function.

### Data integrity
- Derived R2 keys are `<assetId>`-based. Deleting and re-uploading originals invalidates every
  thumbnail, viewer render, and row: run `prune-missing` then `sync:r2`.
- Shared types live in `src/types/` — never redeclare `Asset` in a page.

---

## Known gaps

| # | Gap | Where |
|---|---|---|
| 1 | `/api/*` bypasses the password gate — anyone with a URL can read the gallery JSON | `src/proxy.ts` |
| 2 | Face pipeline not built: `/people` shows a holding state, no "That's me", no "N of you" | `src/lib/people/tiers.ts` has the tiering + threshold ready |
| 3 | Derived facets absent: group size, objects/scenes, quality culling, sub-moments | needs CLIP + blur/dupe detection |
| 4 | No bulk download; iOS cannot save to the camera roll from a plain link | needs `navigator.share` + a signed zip |
| 5 | No error boundaries — a failed fetch reads as an empty gallery | `error.tsx` per route |
| 6 | `GUEST_PASSWORD` and `ADMIN_REINDEX_SECRET` are still placeholders in Vercel | owner action |
| 7 | Voice notes, venue wall, post-event nudge, "a year ago today" not started | roadmap |

---

## Key files

| Thing | File |
|---|---|
| Prisma client / schema | `src/lib/db.ts` · `prisma/schema.prisma` |
| Day + function queries | `src/lib/tags/queries.ts` |
| Media URL tiers | `src/lib/storage/assetUrls.ts` · `src/lib/r2/client.ts` |
| Face-wall tiering rules | `src/lib/people/tiers.ts` |
| Admin auth | `src/lib/adminAuth.ts` |
| Site config (couple names) | `src/lib/settings.ts` |
| Page chrome | `src/components/AppShell.tsx` · `BottomTabs.tsx` · `DesktopNav.tsx` |
| Reusable gallery | `src/components/MediaGrid.tsx` · `MediaCard.tsx` · `MediaViewerModal.tsx` |
| Import pipeline | `scripts/sync-r2-media.ts` · `cluster-events.ts` |

---

## Owner workflow

```bash
# 1. put originals in the R2 bucket under media/
npm run sync:r2          # thumbnails, viewer renders, blur, EXIF dates
npm run cluster:events    # group into days → candidate functions
# 2. open /admin, name each function, publish it
```

Repair when files were deleted from the bucket: `npx tsx scripts/prune-missing.ts && npm run sync:r2`.

---

## What NOT to add without explicit instruction

Comments · visible like counts · profiles, follows, activity feeds · guest uploads · photo
filters or editing · public sharing or discoverability · leaderboards · MongoDB or any
non-Postgres primary DB · SaaS / multi-tenant patterns · a landing page (first screen after
auth is the days).

---

## After every task

1. `npm run build` must pass (regenerate Prisma first if the schema changed).
2. Verify in the browser at the 390px breakpoint before the desktop one.
3. Record behaviour changes in `docs/CHANGELOG.md` and `docs/TASKS.md`.
