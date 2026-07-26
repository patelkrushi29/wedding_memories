---
globs: scripts/**/*.ts
---

# Rules for Scripts

CLI scripts run outside Next.js. Always `import 'dotenv/config'` first and
`import { prisma } from './db'` — never `new PrismaClient()`.

## The pipeline, in order

| Script | npm | What it does |
|---|---|---|
| `upload-to-r2.ts` | `upload:r2` | Uploads a local folder into `media/`, preserving subfolders. **Nothing else** — no renders, no rows. `--from "path"`, `--dry`. |
| `sync-r2-media.ts` | `sync:r2` | **The single owner of everything derived.** Indexes `media/` → Postgres and, per photo, produces the thumbnail (600px webp), viewer render (1600px webp), blur placeholder and EXIF `takenAt` — downloading each original once and deriving every tier from that one buffer. Rebuilds automatically when an original's byte count changes; `--force` rebuilds regardless. |
| `cluster-events.ts` | `cluster:events` | Builds the day → function spine from timestamps (`--gap=N` hours, default 3). Functions are created **hidden** for the host to name. Also adopts orphan functions into days. Warns when EXIF capture times are missing, because then it is grouping upload times. |

**Do not add a second path that writes derived files or asset rows.** The deleted
`import-media.ts` did exactly that and drifted: it wrote local `/generated/` thumbnail paths and
never knew about `viewerPath` or `blurDataUrl`, so anything imported through it rendered without
placeholders and fell back to serving full originals. Upload, then sync.
| `prune-missing.ts` | — | Deletes rows whose R2 file is gone, plus emptied functions/days. Run after deleting files from the bucket. `--dry` to preview. |
| `list-bucket.ts` | — | What is actually in R2, by prefix. |
| `audit-thumbnails.ts` | — | Diffs DB `thumbnailPath` against R2 reality. First thing to run when images 404. |
| `test-db-connection.ts` | `test:db` | Connection check. |

## R2 object layout

```
media/<filename>          originals (source of truth)
thumbnails/<assetId>.webp grid tier
viewer/<assetId>.webp     viewer tier
```

Derived keys are `<assetId>`-based, so **deleting and re-uploading originals invalidates
every derived file and every row**. `prune-missing` then `sync:r2` is the repair.

## Error handling

Per-file try/catch — one bad file must not stop a 10,000-file run. Log progress every 25–50
files. Always `await prisma.$disconnect()`.

## Asset type

`'PHOTO'` or `'VIDEO'` — uppercase only.
