# Wedding Memories

A private wedding gallery. Guests open a link, enter one password, and browse the photographs by
day and by the people in them. Next.js on Vercel, Postgres on Supabase, media on Cloudflare R2.

No feed, no comments, no like counts, no profiles. Saving a photo is a private bookmark on your own
device — nothing a guest does is visible to another guest.

## How it's organised

**Days contain functions.** A wedding is several days and several functions (mehendi, sangeet, the
ceremony), each with a different guest list, so that hierarchy is the spine of the app rather than
folders or albums. Timestamps propose the grouping; the couple names and publishes it.

Three tabs: **The days**, **People** (find yourself by tapping a face — not built yet), **Saved**.

Images are delivered in three tiers — 600px for grids, 1600px for the viewer, and the original only
for a deliberate zoom or download.

## Setup

```bash
npm install
cp .env.example .env      # then fill in DATABASE_URL and the R2 variables
npx prisma migrate deploy
npm run dev
```

Open <http://localhost:3000> and enter `GUEST_PASSWORD`.

## Adding photographs

```bash
npm run upload:r2 -- --from "D:/path/to/originals"   # local folder → R2 media/
npm run sync:r2                                       # thumbnails, viewer renders, blur, EXIF
npm run cluster:events                                # group into days → candidate functions
```

Then open `/admin`, name each function, and publish it. Subfolders are preserved as R2 keys, so a
folder per event becomes an album name.

**Upload camera originals, not exports.** Resized copies usually have their EXIF stripped, and
without capture times the day/function grouping has nothing to work from.

If files are already in the bucket under `media/`, skip the upload step. `sync:r2` owns everything
derived and is safe to re-run — it only does work that's missing.

## Visual clustering

When the photographs have no usable EXIF capture times, the events are recovered from what the
photos *look like* instead. Same computation later powers object filters and "more like this".

Weights are loaded from disk rather than the Hub — a batch job over thousands of photos shouldn't
depend on a network fetch to start, and the Hub download reset mid-transfer on at least one
connection. `models/` is gitignored, so fetch it once:

```bash
mkdir -p models/clip-vit-base-patch32/onnx
cd models/clip-vit-base-patch32
base=https://huggingface.co/Xenova/clip-vit-base-patch32/resolve/main
for f in config.json preprocessor_config.json tokenizer.json tokenizer_config.json; do
  curl -sL --retry 5 --retry-all-errors -o "$f" "$base/$f"
done
cd onnx
for f in vision_model_quantized.onnx text_model_quantized.onnx; do
  curl -sL --retry 5 --retry-all-errors -o "$f" "$base/onnx/$f"
done
```

Then:

```bash
npm run embed                          # ~2 photos/sec, resumable
npm run cluster:visual -- --dry        # see the proposed grouping
npm run cluster:visual                 # write hidden candidates for /admin
```

Embedding reads the 600px thumbnail, not the original — CLIP downsamples to 224px anyway, so this
is roughly 320 MB of R2 reads for 10,000 photos instead of 80 GB.

Tuning: `--threshold` (lower = fewer, broader scenes), `--merge` (how readily two cameras' scenes are
treated as the same function), `--min`, `--confirm`. Start with `--dry` and iterate.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` / `build` | Development server / production build |
| `npm run upload:r2` | Local folder → R2 `media/`. `--from "path"`, `--dry` |
| `npm run sync:r2` | Index R2 → Postgres and derive every image tier. `--force` to rebuild |
| `npm run cluster:events` | Build the day → function spine from EXIF timestamps. `--gap=N` hours |
| `npm run embed` | CLIP embedding per photo. `--limit=N`, `--force` |
| `npm run cluster:visual` | Group by appearance when timestamps are missing. `--dry` first |
| `npm run test:db` / `db:studio` | Connection check / Prisma Studio |

Diagnostics, run with `npx tsx scripts/<name>.ts`: `list-bucket` (what's in R2),
`audit-thumbnails` (database vs reality — run this first if images 404), `prune-missing` (drop rows
whose files were deleted), `progress`, `inspect-originals` (resolution and EXIF of what you
uploaded), `inspect-filenames` (cameras and shooting sequence, useful when EXIF is missing).

## Documentation

| Doc | Purpose |
|-----|---------|
| [`CLAUDE.md`](CLAUDE.md) | How to work in this repo — conventions, gaps, decisions |
| [`docs/TASKS.md`](docs/TASKS.md) | Current status and what's next |
| [`docs/PLAN.md`](docs/PLAN.md) | The phase plan and backlog |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Env vars and the Vercel gotchas |
| [`docs/CHANGELOG.md`](docs/CHANGELOG.md) · [`DECISIONS.md`](docs/DECISIONS.md) | What happened, and why |

Per-area rules live in `.claude/rules/` and load automatically when the matching code is edited.

## Layout

```
src/app/          Pages and API routes
src/components/   UI
src/lib/          Database, R2, media URLs, settings
scripts/          Upload, sync, clustering, diagnostics
prisma/           Schema and migrations
(R2 bucket)       media/ originals · thumbnails/ · viewer/
```
