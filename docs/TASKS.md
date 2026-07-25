# Tasks — current status and next action

**Updated:** 2026-07-25. Read `CLAUDE.md` first, then this file. The full phase plan is
`docs/PLAN.md`; history is `docs/CHANGELOG.md`.

---

## Status

**Version 0.3.** Cloud stack live on Vercel; guest experience redesigned (Darkroom, day → function).
282 placeholder photos indexed with three image tiers. Faces and derived facets not started.

Live: <https://wedding-memories-sage.vercel.app> · Host tools: `/admin` (local dev only until the
admin secret is set).

---

## Waiting on the owner

Nothing in the codebase moves these forward.

| # | Action | Why it matters |
|---|---|---|
| 1 | **Upload camera originals** and give the folder path | The current 282 files are 1024px with no EXIF — the old app's downsized copies. No capture times means no real day/function detection; low resolution means weak face clustering and disappointing downloads. This blocks Phases C and D. |
| 2 | **Change `GUEST_PASSWORD`** from `wedding` | One guess opens the gallery once a link is forwarded. |
| 3 | Add `ADMIN_REINDEX_SECRET` *(backlogged)* | Only needed to run host tools from the live site rather than local dev. |

Once (1) lands: `npx tsx scripts/prune-missing.ts` if filenames changed, then `npm run sync:r2`
(replaced originals are detected by byte count and rebuilt automatically), then
`npm run cluster:events`, then name the functions in `/admin`.

---

## Next up in the code

In order. Each is described in `docs/PLAN.md`.

1. **Decide the face provider** (Rekognition vs self-hosted InsightFace) — needed before C1, and it
   is a cost/ops tradeoff the owner should weigh in on.
2. **Phase C1–C4** — detection, clustering, the face wall, "That's me". The single highest-value
   feature in the product.
3. **Phase D1–D2** — quality culling and group size. Both cheap, both immediately visible.
4. **Phase F1** — single-photo save via the share sheet. Small, and currently iOS guests cannot
   save a photo to their camera roll at all.

Do **not** start Phase C or D against the placeholder library. Clustering 282 low-resolution frames
with identical timestamps proves nothing.

---

## Doc debt

The redesign deleted a lot of code, and these reference docs still describe it. They are actively
misleading — `STORAGE.md` documents a `StorageProvider` interface that no longer exists, and
several describe the old gold/white design and SQLite.

`ARCHITECTURE.md` · `API.md` · `COMPONENTS.md` · `CONVENTIONS.md` · `DATABASE.md` · `STORAGE.md` ·
`AUTH.md` · `MEDIA-IMPORT.md` · `TESTING.md` · `WORKFLOWS.md`

**Recommendation:** delete them. Their accurate content already lives in `.claude/rules/*`, which is
better placed — those files load automatically when the matching code is edited, so they cannot be
forgotten the way a doc folder can. That would leave a maintainable set: `CLAUDE.md`, `PLAN.md`,
`TASKS.md`, `CHANGELOG.md`, `DECISIONS.md`, `DEPLOY.md`.

Not done unilaterally — say the word and it takes one commit.

`CHANGELOG.md` and `DECISIONS.md` are historical records; references to SQLite and albums in those
are correct and should stay.

---

## Known gaps

Tracked in `CLAUDE.md` under "Known gaps": the `/api/*` auth bypass, no bulk download, no family
link, no rate limit on login, video posters requiring manual upload.
