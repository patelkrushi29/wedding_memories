# Media Import

## Folder Structure

Place media files under `media/wedding/` in the project root:

```
media/
  wedding/
    Highlights/          → becomes "Highlights" album, all assets get isHighlight=true
    Ceremony/            → becomes "Ceremony" album
    Reception/           → becomes "Reception" album
    Dancing/             → becomes "Dancing" album
    DSC_001.jpg          → root-level files go to "All Media" album (slug: all-media)
    DSC_002.mp4
```

Rules:
- Each **top-level subfolder** becomes one album. The folder name is the album title, slug is auto-generated (lowercase, dashes).
- Files **directly in `media/wedding/`** (no subfolder) go to the virtual album "All Media" with slug `all-media`.
- A folder named exactly **`Highlights`** creates the Highlights album AND sets `isHighlight=true` on every asset in it. These assets appear on the `/highlights` page.
- Nested subfolders are walked recursively but all files within a top-level folder go to that folder's album (nesting doesn't create sub-albums).

The `media/` directory is gitignored — never commit media files.

---

## Running the Import

```bash
npm run import:media
```

This runs `scripts/import-media.ts` via `tsx`.

**Environment variables:**
- `MEDIA_ROOT` — override the media folder path (default: `./media/wedding`)
- `DATABASE_URL` — override the database path (default: `file:./dev.db`)

---

## What the Import Script Does (Step by Step)

1. Walks `media/wedding/` recursively, collects all files with supported extensions.
2. Marks **all existing Asset records** as `isAvailable=false` (will be corrected for found files).
3. For each media file:
   a. Determines the album from the top-level folder name.
   b. Creates the album with `upsert` (no duplicate albums on re-run).
   c. Reads file stats (size, mtime) and for photos, reads pixel dimensions via `sharp` and EXIF date via `exifr`.
   d. Upserts the Asset record using `relativePath` as the dedup key.
   e. Generates a thumbnail if one doesn't already exist.
4. Logs a summary: imported/updated count, errors, and how many assets are now marked unavailable (files no longer on disk).

Re-running import is safe — existing records are updated, not duplicated.

---

## Thumbnail Generation

- **Location:** `public/generated/thumbnails/<assetId>.webp`
- **Format:** WebP, quality 80
- **Max width:** 600px (height scaled proportionally by `sharp`)
- **When generated:** During import, only if `Asset.thumbnailPath` is null. Already-thumbnailed assets are skipped.
- **The path stored in DB** is the relative URL: `/generated/thumbnails/<assetId>.webp`
- `public/generated/` is gitignored — thumbnails are regenerated on first import.

---

## Video Poster Generation

- **Location:** `public/generated/thumbnails/<assetId>_poster.jpg`
- **Tool:** `ffmpeg` (must be installed separately — `brew install ffmpeg` or `apt install ffmpeg`)
- **Frame extracted at:** 1 second into the video
- **Graceful fallback:** If `ffmpeg` is not installed or fails, the error is silently caught. The video card in the UI falls back to a placeholder icon.
- Videos set both `posterPath` and `thumbnailPath` to the same poster file path.

---

## Regenerating Thumbnails Only

To regenerate missing thumbnails without doing a full media re-import:

```bash
npm run generate:thumbnails
```

This runs `scripts/generate-thumbnails.ts`, which queries all assets where `thumbnailPath IS NULL` and generates thumbnails for them.

---

## Resetting Everything

```bash
npm run reset:local
```

This runs `scripts/reset-local.ts`, which:
1. Deletes all Asset and Album records from the database.
2. Removes the `public/generated/` directory.

After reset, run `npm run import:media` to re-import from scratch.

---

## Supported File Types

**Photos:** `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`

**Videos:** `.mp4`, `.mov`, `.m4v`, `.webm`

---

## HEIC Note

iPhones export photos in HEIC format by default. HEIC files are **not supported** — `sharp` cannot process them without additional native libraries.

**Convert before importing:**
```bash
# macOS — using sips (built-in)
sips -s format jpeg photo.heic --out photo.jpg

# Cross-platform — using ImageMagick
magick photo.heic photo.jpg

# Batch convert all HEIC in a folder
for f in *.heic; do sips -s format jpeg "$f" --out "${f%.heic}.jpg"; done
```

After converting, delete the `.heic` originals before running `npm run import:media`.
