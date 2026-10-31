# Wedding Memories — Claude Code Operating Manual

A private, password-gated wedding gallery. **Live:** Next.js on Vercel + **Supabase Postgres** +
**Cloudflare R2**. The couple imports the media; guests browse.

**Current version:** 0.4 — "Highlight reel" redesign: best photos first, story-style reels, folded bursts, Make a post.

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
| **Main goal: everyone leaves with their best photos** (2026-10-31) | Rank, fold bursts, surface "your best" and a highlights strip per function, and help guests make a post or collage they share themselves from their own device. See Phase G in `docs/PLAN.md`. |
| **One wedding, product quality** | Single-tenant schema (no Wedding root entity, no host accounts) but the design and polish are held to product standard. |
| **No feed, no comments, no like counts, no profiles** | The heart is a *private* save marker on the visitor's own device. Nothing a guest does is broadcast to another guest. |
| **Face wall before selfie** | Guests find themselves by tapping a face, which needs no biometric consent. A selfie is the escape hatch, never the toll gate. |
| **"That's me" claiming** | A visitor taps their own face once; it lives in localStorage. That is the entire identity model — it unlocks "N of you" counters and the per-guest recap. |
| **Guest uploads deferred** | No "Add" tab yet. Browsing, faces, and facets first. |
| **Outfits in the pipeline, never in the UI** | Clothing embeddings help re-identify people across days and detect function boundaries. There is no "red lehenga" filter. |

---

## Information architecture

Three tabs (floating pill on phones): **Home / You / Saved**. Days contain functions; the guest
sees them as events.

```
/                     Home — cover + "Watch the weekend" reel, event story circles,
                      "Find your best photos", a "Best of the <event>" row per event
/functions/[slug]     One event — cover + "Play the best N", best moments strip,
                      every photo with near-duplicate bursts folded behind the best take
/people               "You" — the face wall (awaiting the face pipeline; honest holding page)
/saved                Private saves, this device only → "Make a post from these"
/post                 Make a post — story 9:16 / carousel 4:5 / grid 1:1, rendered on-device
/auth                 Password gate (no photo before the password)
/admin                Host: name and publish functions
```

Video is a **filter inside an event**, never its own tab. No feed, no albums page.

### Best photos (Phase G)

`npm run pick:best` scores every photo (Tenengrad sharpness + exposure), folds bursts of
near-identical frames into a `MOMENT` tag (`source: "quality"`, cover = best take, AssetTag rows =
the *other* takes) and sets `Asset.isHighlight` on a time-spread set per event. No schema change.
Until it has run, `getFunctionHighlights()` falls back to an even spread across the event.
Re-run it after every import or re-cluster.

---

## Design system — "Highlight reel"

Dark, cinematic, photos are the colour. Full tokens and type roles: `.claude/rules/components.md`.

- Surfaces `--ink #0E0E10` → `--plate #1C1B1E` → `--plate-2 #242327`, hairlines `--veil #34323A`
- Text `--paper #F5F2EC` → `--ash #A8A39A` → `--dim #858077`
- Accent **marigold** `--accent #F4B23E` for the next action only (Watch, Save to Photos, Share)
- **Bricolage Grotesque** 800 for display (`.display`), **DM Sans** for everything else;
  `.eyebrow` for small uppercase labels, `.meta` for counts and times. Fonts are self-hosted.
- Photos in reels are shown whole over a blurred fill of themselves — never story-cropped.

---

## Critical rules

### Security
- Never accept a raw file path from the client — only asset ids. The server resolves keys.
- Never expose `originalPath` / `thumbnailPath` / `viewerPath` / `posterPath`. Use
  `attachMediaUrls()`.
- Auth cookie `wg-auth` holds an HMAC keyed by `GUEST_PASSWORD` (`src/lib/auth/guestToken.ts`), httpOnly, Secure in production. Never compare it to a literal.
- `/api/*` requires that cookie (401 otherwise) except `/api/auth/*`; `/api/admin/*` uses its bearer token.
- **Config files are an attack surface.** `tailwind.config.js` was injected with malware once (2026-07). Before committing, look for code after the closing `};` or very long lines in any `*.config.*` file.
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
| 2 | Face pipeline not built: `/people` shows a holding state, no "That's me", no "N of you" | `src/lib/people/tiers.ts` has the tiering + threshold ready |
| 3 | Faces not in the best-photo score yet (eyes open, faces lit); no group-size facet | after Phase C |
| 4 | No bulk download (single-photo Save to Photos works via the share sheet) | needs a signed zip |
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
| Home / event screens | `HomeExperience.tsx` · `FunctionView.tsx` · `StoryReel.tsx` |
| Best-photo picking | `scripts/pick-best.ts` · `getFunctionHighlights()` / `NOT_FOLDED` in `src/lib/tags/queries.ts` |
| Make a post | `PostComposer.tsx` · `src/lib/postRender.ts` · `src/lib/postBasket.ts` |
| Reusable gallery | `src/components/MediaGrid.tsx` · `MediaCard.tsx` · `MediaViewerModal.tsx` |
| Import pipeline | `scripts/upload-to-r2.ts` (upload only) · `sync-r2-media.ts` (owns all derived data) · `cluster-events.ts` |

---

## Owner workflow

```bash
npm run upload:r2 -- --from "D:/path/to/originals"   # local folder → R2 media/
npm run sync:r2                                       # thumbnails, viewer renders, blur, EXIF
npm run cluster:events                                # group into days → candidate functions
# then open /admin, name each function, publish it
npm run pick:best                                     # score, fold bursts, mark highlights
```

Subfolders are preserved as R2 keys, so a folder per event (`Ceremony/`, `Sangeet/`) becomes an
album name — the most reliable signal for naming functions when EXIF is missing.

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
