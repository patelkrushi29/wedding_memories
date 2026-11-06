# Tasks — current status and next action

**Updated:** 2026-10-31. Read `CLAUDE.md` first, then this file. The full phase plan is
`docs/PLAN.md`; history is `docs/CHANGELOG.md`.

---

## Status

**Version 0.3.** Cloud stack live on Vercel; guest experience redesigned (Darkroom, day → function).
282 placeholder photos indexed with three image tiers. Faces and derived facets not started.

Live: <https://wedding-memories-sage.vercel.app> · Host tools: `/admin` (local dev only until the
admin secret is set).

---

## URGENT — security (2026-10-31)

Malware was committed in `a91fadb` and ran on every Vercel build since 2026-07-26. See
CHANGELOG session 8. Until these are done, assume every secret it could read is stolen.

| # | Action |
|---|---|
| S1 | **Treat the Windows PC that made `a91fadb` as compromised.** Look for `config.bat` in this project and others; scan; ideally reinstall. Do the steps below from a different, clean device. |
| S2 | **Rotate every secret**: Supabase database password, Cloudflare R2 access keys, Vercel tokens, GitHub password + revoke sessions/tokens/SSH keys, and passwords saved in that PC's browser. Then update Vercel env vars. |
| S3 | Check other repos on that PC and GitHub account for the same injection (search config files for `_0x` or `global.i=`). |
| S4 | Don't run `npm install` / `npm run dev` for this project on that PC until S1 is done — the source is on the machine and re-injects. |

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

## After the redesign ships

Add the repository secrets and run the **Photo pipeline** GitHub Action with *pick the best* and
*find faces* ticked (docs/DEPLOY.md). Until then: highlights are an even spread rather than the
sharpest picks, bursts aren't folded, and the You tab shows "coming soon". Re-run after every import.

---

## Next up in the code

In order. Each is described in `docs/PLAN.md`.

1. ~~Decide the face provider~~ — free on-CPU detector chosen on measurements (DECISIONS D24).
2. ~~Phase C1–C5~~ — done (free CPU pipeline, wall, That's me, Your best, host merge). Next in C:
   C6 per-guest recap screen, C7 faces in video.
3. **Phase D2 + G2** — group size, and "Your best" once faces exist (quality culling/bursts done: `pick:best`).
4. ~~**Phase F1** — single-photo save via the share sheet.~~ Done 2026-10-31; needs the R2 CORS rule in `DEPLOY.md`.

Faces and best-photo picking run fine on the current 1024px library, but camera originals will
give sharper face crops, better grouping of small faces, and real capture times. Upload them,
then re-run the Photo pipeline with *sync* ticked too.

---

## Doc debt

Resolved — the stale reference docs were deleted in `f037522`.

---

## Known gaps

Tracked in `CLAUDE.md` under "Known gaps": the `/api/*` auth bypass, no bulk download, no family
link, no rate limit on login, video posters requiring manual upload.
