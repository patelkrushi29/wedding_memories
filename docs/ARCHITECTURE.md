# Architecture

## Project Purpose

Wedding Memories Gallery is a self-hosted, password-gated photo and video gallery for sharing wedding media with guests. It runs entirely on a local machine with no cloud dependencies — guests browse albums, view highlights, and mark favourites. Media is imported from a local folder, thumbnails are pre-generated, and everything is served from a single Next.js process backed by a SQLite database.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router, React Server Components) |
| Database | SQLite via Prisma 7 + `@prisma/adapter-libsql` |
| UI primitives | Hand-built Radix UI + class-variance-authority (no shadcn CLI) |
| Styling | Tailwind CSS |
| Image processing | sharp (thumbnails), ffmpeg (video posters) |
| Icons | lucide-react |
| Fonts | Playfair Display (serif headings), system sans |
| Scripts | tsx (TypeScript Node scripts) |

## Directory Tree

```
src/
  app/                        Next.js App Router pages and API routes
    admin/page.tsx            Admin dashboard (reindex trigger)
    albums/page.tsx           Album list page
    albums/[slug]/page.tsx    Individual album page
    api/
      admin/reindex/route.ts  POST — trigger media re-import
      albums/route.ts         GET — list all albums
      albums/[slug]/route.ts  GET — album detail + paginated assets
      assets/route.ts         GET — filterable, paginated asset list
      auth/guest-password/    POST — validate password, set cookie
      media/[id]/
        download/route.ts     GET — force-download original file
        preview/route.ts      GET — stream original for in-browser view
        thumbnail/route.ts    GET — serve webp thumbnail
    auth/page.tsx             Password gate page
    find-yourself/page.tsx    Coming-soon face search page
    highlights/page.tsx       Highlights grid (default landing after auth)
    photos/page.tsx           All photos grid
    selected/page.tsx         Favourites page (reads localStorage IDs)
    videos/page.tsx           All videos grid
    layout.tsx                Root layout (font loading, TopNav)
    page.tsx                  Root redirect → /highlights
    globals.css               Tailwind base + custom CSS vars
  components/
    AlbumCard.tsx             Album thumbnail + title card (link to album page)
    EmptyState.tsx            Empty state illustration component
    FavoriteButton.tsx        Heart toggle — reads/writes localStorage
    FilterBar.tsx             Sort/filter controls for media grids
    LoadingGrid.tsx           Skeleton grid shown during data fetch
    MediaCard.tsx             Photo thumbnail card with hover actions
    MediaViewerModal.tsx      Fullscreen lightbox (photo + video, keyboard nav)
    TopNav.tsx                Sticky header with nav links
    VideoCard.tsx             Video thumbnail card with duration badge
    ui/                       Primitive UI components (Radix UI wrappers)
      badge.tsx
      button.tsx
      card.tsx
      dialog.tsx
      dropdown-menu.tsx
      input.tsx
      skeleton.tsx
      toast.tsx
  lib/
    db.ts                     Prisma client singleton (resolves relative DB URLs)
    storage/
      types.ts                StorageProvider interface
      localStorageProvider.ts Local implementation (routes through API endpoints)
    utils.ts                  cn(), formatBytes(), other helpers
  middleware.ts               Auth check — redirects unauthenticated requests to /auth
prisma/
  schema.prisma               Database schema (5 models)
prisma.config.ts              Prisma 7 config (datasource URL lives here, not schema.prisma)
scripts/
  import-media.ts             Scans media/wedding/, upserts DB records, generates thumbnails
  generate-thumbnails.ts      Regenerates missing thumbnails only (no full re-import)
  reset-local.ts              Wipes DB records + public/generated/ folder
media/wedding/                Source media files (gitignored)
public/generated/
  thumbnails/                 Generated webp thumbnails + video poster jpgs (gitignored)
```

## Data Flow

```
Browser request
  └─► src/middleware.ts
        checks wg-auth cookie
        ├─ missing/wrong → redirect /auth
        └─ valid → NextResponse.next()
              └─► App Router page or API route
                    └─► src/lib/db.ts (Prisma client singleton)
                          └─► SQLite (dev.db via libsql adapter)
                                └─► JSON response or rendered HTML
                                      └─► UI components reference media
                                            via /api/media/[id]/* endpoints
                                            (never raw file paths)
```

## What Is NOT Built Yet

- Cloud storage (Cloudinary, S3, Supabase Storage)
- Face recognition or the Find Yourself feature (schema placeholder only)
- ZIP download (button exists but is disabled with "Coming soon")
- Guest uploads
- Supabase backend or authentication
- Vercel / production deployment config
- Landing page (first page after auth is /highlights)
- Email sharing, watermarking, or access expiry
