---
globs: scripts/**/*.ts
---

# Rules for Scripts (import-media, generate-thumbnails, reset-local)

You are editing a CLI script. These run as standalone Node processes, not inside Next.js.

## Always import Prisma from scripts/db.ts
```ts
import { prisma } from './db';
```
NEVER use `new PrismaClient()` directly in scripts — it will crash under Prisma 7 without the libsql adapter.

## scripts/db.ts is the shared Prisma client for all scripts
It handles the libsql adapter and absolute URL resolution. Do not duplicate this logic.

## Error handling
Catch errors per-file inside loops. Never let one bad file stop the entire import.
```ts
try {
  // process file
} catch (err) {
  console.error(`Error processing ${filePath}:`, err);
  errors++;
}
```

## Always disconnect at the end
```ts
await prisma.$disconnect();
```

## Thumbnail path format
Store as relative URL, not filesystem path:
```ts
thumbnailPath: `/generated/thumbnails/${assetId}.webp`
```

## Album slug generation
```ts
import slugify from 'slugify';
const slug = slugify(folderName, { lower: true, strict: true });
```

## Asset type values
Always uppercase: `'PHOTO'` or `'VIDEO'` — never lowercase.
