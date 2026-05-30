---
globs: scripts/**/*.ts
---

# Rules for Scripts (import-media, generate-thumbnails, reset-local)

**Full docs:** `docs/MEDIA-IMPORT.md` · **Cloud import:** `docs/DEPLOY.md` (C3)

CLI scripts run outside Next.js.

## Prisma client

```ts
import { prisma } from './db';
```

Use `scripts/db.ts` — never raw `new PrismaClient()` in scripts.

## Target (C3): upload to Cloudflare R2

- Owner stages files under `MEDIA_ROOT` (default `media/wedding/`)
- Import generates thumbs (sharp/ffmpeg) → **upload to R2** → write **Postgres** metadata
- Do not rely on `public/generated/` in production

## Error handling

Per-file try/catch; one bad file must not stop the run.

## Always disconnect

```ts
await prisma.$disconnect();
```

## Asset type

`'PHOTO'` or `'VIDEO'` — uppercase only.

## Album slug

```ts
slugify(folderName, { lower: true, strict: true });
```
