# Project Plan — Wedding Memories Gallery

## Gap Analysis: PRD vs Current Build

Assessed against the PRD's 20-point Definition of Done (section 43) and feature requirements.

### Passing (working as specified)

| # | Requirement | Status |
|---|---|---|
| 1 | App runs with `npm run dev` | Build succeeds, routes render |
| 2 | Owner adds files to `media/wedding` | Folder structure works |
| 3 | `npm run import:media` works | Script scans, creates albums, generates thumbnails |
| 4 | Albums created from folders | Top-level folders → albums, Highlights special case |
| 5 | Highlights page | Fetches highlights album, fallback to first 100 photos |
| 6 | Photos page with pagination | Load-more pagination, filter/sort/search |
| 7 | Videos page | Video cards, load-more, modal player |
| 8 | Album pages | Album list + album detail with pagination |
| 9 | Full-resolution download | Streams original file, sets Content-Disposition |
| 10 | Selected/favorites (localStorage) | Heart toggle, selected page, clear all |
| 11 | Password gate | Cookie auth, plaintext env comparison |
| 12 | Admin page with counts | Shows photos/videos/albums/total, reindex button |
| 17 | Originals not committed | .gitignore covers media/ and public/generated/ |
| 18 | Face recognition placeholder | FuturePerson + FutureFaceMatch in schema, /find-yourself page |
| 20 | No cloud services required | Pure local stack |

### Failing or Incomplete

| # | Requirement | Issue | Severity |
|---|---|---|---|
| 13 | Admin reindex works | Reindex calls `execSync('npx tsx scripts/import-media.ts')` — the import script creates `new PrismaClient()` without the libsql adapter. May fail under Prisma 7 if the adapter is required at runtime. Needs verification. | High |
| 14 | Mobile-friendly | Not verified — no test has been run. CSS is responsive but touch targets, modal swipe, and video player on mobile are unconfirmed. | Medium |
| 15 | README clear for non-technical owner | Current README is developer-focused. Missing: prerequisite install steps, troubleshooting, HEIC note, "what to do if X doesn't work." | Medium |
| 16 | Thumbnails used in grids | Thumbnails are used BUT via API route (Node.js handler per request), not static files. Works for local but will be slow at scale. | Low |
| 19 | Storage abstraction exists | Interface exists but is dead code — nothing imports `localStorageProvider.ts`. URLs hardcoded in API routes. | Medium |

### Feature Gaps (specified in PRD but missing or broken)

| Feature | PRD Section | Status |
|---|---|---|
| photoCount/videoCount in album API | §18 | Always returns 0 — only totalCount works |
| Album cover from `coverAssetId` | §18 | Field exists in DB but no UI to set it |
| Search within album detail page | §19 | Album detail has no filter bar |
| Video duration display | §20 | Duration badge exists in UI but import script doesn't extract video duration |
| Video file size display | §20 | Shown in VideoCard via formatBytes — works |
| Mobile swipe in viewer | §21, §32 | Not implemented |
| Download selected as ZIP | §22 | Button exists, disabled with "Coming soon" — correct per PRD |
| Highlights fallback (no folder → first 100) | §16 | Implemented but uses `sort=newest` which may not match "first 100 photos" intent |
| Shared Asset type | §30 | PRD lists component specs; Asset interface duplicated 8 times across files |
| `next/font` for Playfair Display | §8/§31 | Uses CSS @import instead — slower font loading, layout shift risk |

### Architecture Gaps

| Issue | Impact |
|---|---|
| No shared types file | Adding a field means editing 8 files |
| StorageProvider not wired up | Cloud migration requires rewiring, not just adding a provider |
| Albums page HTTP self-fetch | Fails if port isn't 3000, adds latency, breaks in build |
| Admin stats: 4 API calls for counts | Wasteful, should be 1 dedicated endpoint |
| No error boundaries | Any component crash takes down the whole page |
| Import script PrismaClient inconsistency | Uses raw `new PrismaClient()`, different from app's adapter-based client |

---

## Stabilization Phase (do first)

These are bugs and gaps that need fixing before the app can be reliably tested.

### S1: Verify the app actually runs end-to-end

Before any code changes, do a full smoke test:
1. Create test media: 10 photos in `media/wedding/Highlights/`, 5 in `media/wedding/Ceremony/`, 1 video in `media/wedding/Videos/`
2. Run `npm run import:media` — verify it completes
3. Run `npm run dev` — verify no errors
4. Test every page: auth → highlights → photos → albums → album detail → videos → selected → admin → find-yourself
5. Test the media viewer (open, arrows, escape, download)
6. Test favorites (add, check /selected, remove)
7. Test reindex button on admin page

### S2: Extract shared types

Create `src/types/asset.ts` with the Asset interface. Import it everywhere that currently defines its own. This prevents drift when fields are added.

Files to update: `highlights/page.tsx`, `photos/page.tsx`, `videos/page.tsx`, `selected/page.tsx`, `albums/[slug]/page.tsx`, `MediaCard.tsx`, `MediaViewerModal.tsx`, `VideoCard.tsx`

### S3: Fix photoCount/videoCount in albums API

`GET /api/albums` returns `photoCount: 0, videoCount: 0`. Fix by counting assets grouped by type in the query.

### S4: Fix albums page self-fetch

Replace HTTP self-fetch in `src/app/albums/page.tsx` with direct Prisma query. This eliminates the `NEXT_PUBLIC_BASE_URL` dependency and the port assumption.

### S5: Add admin stats API endpoint

Create `GET /api/admin/stats` that returns all counts in one query. Update admin page to use it. Include: total, photos, videos, albums, missing (isAvailable=false), noThumbnail (thumbnailPath=null).

### S6: Wire up StorageProvider

Make the abstraction real:
1. Update API routes or page-level data mapping to use `localStorageProvider` for URL construction
2. OR at minimum, centralize URL construction in one place (a helper function)
3. Update `docs/STORAGE.md` accordingly

---

## Polish Phase (v0.2)

After stabilization, improve the user experience.

### P1: Improve README for non-technical owner

Rewrite to include:
- What you need installed (Node.js link, Git link)
- How to clone from GitHub (exact commands)
- Step-by-step with expected output at each step
- Troubleshooting section (common errors and fixes)
- HEIC conversion instructions
- "Adding more photos later" workflow
- Screenshots (or describe what each page looks like)

### P2: Switch to next/font for Playfair Display

Replace CSS @import in globals.css with `next/font/google` in layout.tsx. Eliminates render-blocking font request and layout shift.

### P3: Add video duration extraction to import

Use ffprobe (if available) to extract duration. Store in `Asset.durationSeconds`. Graceful fallback if ffmpeg/ffprobe not installed.

### P4: Add search/filter to album detail page

Album detail page (`/albums/[slug]`) should have a FilterBar for searching within the album.

### P5: Mobile improvements

- Test all pages on mobile viewport (375px)
- Ensure tap targets are at least 44x44px
- Add touch swipe to MediaViewerModal (use pointer events or a lightweight swipe library)
- Ensure video player fills mobile viewport correctly
- Test hamburger menu

### P6: Error boundaries

Add a root error boundary in layout.tsx and per-page error.tsx files for graceful error handling.

### P7: Toast notifications

Wire up the existing toast component for:
- "Added to favorites" / "Removed from favorites"
- "Download started"
- "Reindex complete" / "Reindex failed"

---

## Scale Phase (v0.3)

Test with large datasets and optimize.

### SC1: Test with 2,000+ photos

Import a realistic dataset. Measure:
- Import time
- Thumbnail generation time
- Page load times
- Scroll performance
- Memory usage

### SC2: Add infinite scroll (replace load-more)

Convert photos page from "Load more" button to IntersectionObserver-based infinite scroll for smoother experience.

### SC3: Optimize import script

- Add progress reporting (X of Y files processed)
- Batch database operations instead of per-file upserts
- Add `--dry-run` flag
- Add checksum computation for dedup

### SC4: Add image loading optimization

- Use `next/image` with proper width/height for grid thumbnails
- Add blur placeholder data URL during import
- Consider srcset for different screen densities

---

## Production Phase (v0.4)

Migrate to hosted services.

### PR1: Switch database to Supabase (Postgres)

- Update Prisma schema: change provider to `postgresql`
- Migrate Asset.type to proper enum
- Update prisma.config.ts / remove libsql adapter
- Update all scripts

### PR2: Add cloud storage provider

- Implement CloudinaryProvider or S3Provider
- Upload media during import
- Serve from CDN instead of local API routes

### PR3: Deploy to Vercel

- Add vercel.json if needed
- Configure environment variables
- Set up custom domain

### PR4: Upgrade auth

- Switch to Supabase Auth or NextAuth
- Hash passwords with bcrypt
- Add proper session management
- Wire up SiteSetting.guestPasswordHash

---

## Face Recognition Phase (v0.5)

### FR1: Face clustering proof of concept

Choose provider (AWS Rekognition or local library). Process all photos. Store results in FutureFaceMatch.

### FR2: Admin review UI

Build admin page for reviewing and approving face clusters. Associate faces with FuturePerson records.

### FR3: Build /find-yourself

Replace placeholder with face grid. Guest picks their face, sees all matched photos.

---

## Memory Features Phase (v0.6)

Memory pages, collages, reels. Scoped and designed when needed.

---

## Phase Dependencies

```
Stabilize (S1-S6) ──► Polish (P1-P7) ──► Scale (SC1-SC4) ──► Production (PR1-PR4) ──► Face (FR1-FR3) ──► Memory
```

Each phase should be fully completed and tested before starting the next. Within a phase, tasks are independent unless noted.
