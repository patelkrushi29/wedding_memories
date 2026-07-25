# Plan

**Last rewritten:** 2026-07-25, after the Darkroom redesign. Supersedes the old C1–C6 / S2–S6
plan and the separate `ROADMAP.md`, both of which described a stack and an app that no longer
exist.

Companion docs: `CLAUDE.md` (how to work in this repo) · `docs/TASKS.md` (what to do next) ·
`docs/CHANGELOG.md` (what happened) · `docs/DECISIONS.md` (why).

---

## Where we actually are

The cloud stack is live and the guest experience has been redesigned. What works today:

| Area | State |
|---|---|
| Hosting | Vercel, deploying from `main`. Live and verified. |
| Database | Supabase Postgres via the **pooler** connection (the direct host is IPv6-only and fails on Vercel). |
| Storage | Cloudflare R2, public r2.dev base URL. 282 photos indexed. |
| Image delivery | **Three tiers** — grid 600px, viewer 1600px, original only for zoom/download. |
| Structure | Day → function spine. Clustering script proposes; the host names and publishes in `/admin`. |
| Guest UI | Darkroom design system. Three tabs: The days / People / Saved. Swipeable carousel viewer, infinite scroll, blur placeholders, pull-to-refresh, PWA install. |
| Auth | Single shared password, httpOnly + Secure cookie, fails closed when unconfigured. |
| Robustness | Error boundary and not-found pages, so a broken gallery no longer reads as an empty one. |

**Not built yet:** faces, derived facets, bulk download, family link, voice notes, venue wall.

---

## The two things standing in the way

Neither is a coding problem, and both block the phases below.

1. **The library is placeholder data.** The 282 photos in R2 are 1024px, ~200 KB, with **no EXIF**
   — they are the old app's downsized copies. Without capture times, day/function detection has
   nothing to work with; without resolution, face clustering will be weak and downloads will
   disappoint. **Camera originals are the prerequisite for Phase C and D.**
2. **The guest password is `wedding`.** Fine while testing, guessable in one try the moment a link
   is forwarded. Change before the real library goes up.

---

## Phase C — People (the headline feature)

The reason someone opens a wedding gallery is to find themselves. Everything here is described in
the round-2 design notes; the tiering maths is already implemented in `src/lib/people/tiers.ts`.

| Step | Work |
|---|---|
| C1 | Face detection + embedding over every photo. Provider decision pending: **AWS Rekognition** (~$10–15 one-time for 10k, accurate on hard candids) vs self-hosted InsightFace (free, needs a GPU worker). |
| C2 | Cluster embeddings into people. Real `Person` / `Face` models replace the unused `FuturePerson` / `FutureFaceMatch` stubs. Store bounding boxes for face-crop covers. |
| C3 | The face wall: frequency-sorted, tiered by `clamp(total/400, 3, 25)`, blank labels for unnamed clusters (never "Person 47"), pinned couple/host-named/already-saved. |
| C4 | **"That's me"** — one tap claims a cluster, stored on the device. Unlocks "N of you" badges and every "with you" filter. |
| C5 | Host controls: name clusters, merge/split, hide. Separate switches for *face search* and *browse faces*. Per-guest "hide me" removes from the wall, not just from search. |
| C6 | Per-guest recap — attendance span across functions, co-occurrence ("you and Meera, 41 photos"). The most shareable screen in the product. |
| C7 | Face search across **video** — sample frames server-side and index them like stills. Most competitors quietly skip this. |

## Phase D — Derived facets

Turns 10,000 photos into something navigable. All auto-derived; the guest tags nothing.

| Step | Work | Cost |
|---|---|---|
| D1 | **Quality culling** — blur (Laplacian variance) and near-duplicates (perceptual hash), hidden by default. This is what stops a large library feeling like a hard drive. | Local compute, free |
| D2 | **Group size** — face count per photo → "Just me / Two of us / Small group / Crowd". Cheap once C1 exists, and nobody else offers it. | Free after C1 |
| D3 | **Objects and scenes** via CLIP/SigLIP embeddings — rings, decor, the mandap, food, dancing. Zero-shot, so no training. Store vectors in pgvector for "more like this" later. | Free, overnight CPU job |
| D4 | **Sub-moments** — timestamp density inside a function ("the entrance", "the toasts"). | Free |
| D5 | **Outfit embeddings** — pipeline only, never a UI filter. Improves re-identification across days and sharpens function boundaries. | Free |
| D6 | The facet sheet itself, once there is something real to put in it. Deliberately not built yet — a sheet whose only options duplicate the photo/film chips isn't worth shipping. | — |

## Phase E — Emotional returns

Cheap relative to their impact, per the research.

- **E1 Voice and video notes** — 60s cap, recorded in-browser, delivered **only to the couple**.
  No feed, no counts, no replies. Include a real prompt ("what's your favourite memory of us?")
  or you get "congratulations".
- **E2 Venue wall** — a URL a projector opens. Newest upload takes the large tile, rotates.
  Moderation on by default. Nearly free because this is a web app.
- **E3 Post-event nudge** — one message a day later: "you took photos on Friday, 12 aren't here
  yet." Where the long tail of uploads actually comes from.
- **E4 "A year ago today"** — the retention model. Needs the "never opened" flag.

## Phase F — Sharing that works

- **F1** Single photo save via `navigator.share({ files })` — the iOS share sheet is the only route
  to the camera roll from the web. Copy must say "Save to photos", not promise one tap.
- **F2** Bulk download as a server-side zip. On iOS this lands in Files, not Photos — say so in the
  UI. Needs the `archiver` dependency back.
- **F3** Family view link — `/view/[FAMILY_VIEW_TOKEN]`, passwordless for parents.
- **F4** Close the `/api/*` auth gap: guest-facing routes currently answer anyone with the URL.

---

## Backlog

Small, unblocked, do whenever.

| Item | Notes |
|---|---|
| `ADMIN_REINDEX_SECRET` on Vercel | Not set, so `/admin` only works from local dev. Both are the same database, so nothing is blocked — it's convenience. |
| Rename it to `ADMIN_SECRET` | The name is a leftover from a `/api/admin/reindex` endpoint that was deleted; it now guards the host API generally. |
| Persist the admin secret | Currently React state, so it's re-entered every visit. `localStorage` would make it once per device. |
| `NEXT_PUBLIC_COUPLE_NAMES` | Unset, so the gallery header falls back to "Wedding Memories". |
| Custom domain | Still on `wedding-memories-sage.vercel.app`. |
| Rate-limit the login route | No limit today; brute-forcing a shared password is unthrottled. |
| Consolidate `docs/` | 10 reference docs predate the redesign and describe deleted code. See TASKS.md. |
| Video posters | `resolveVideoThumbnail` expects a manually uploaded poster. Should be ffmpeg on import — pick the sharpest, most-faces frame, not frame zero. |

---

## Refused, deliberately

Not "later" — decided against. Reversing any of these is a product decision, not a task.

Comments · visible like counts · profiles, follows, activity feeds · public sharing or
discoverability · photo filters and editing · leaderboards or scored challenges · an outfit filter
in the UI · MongoDB or any non-Postgres primary database · SaaS / multi-tenant patterns.

Guest uploads are **deferred, not refused** — they need resumable transfer over bad venue wifi,
on-device compression, and a moderation queue, which is a phase of its own.
