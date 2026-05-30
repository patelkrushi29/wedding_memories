# Database

## Target: PostgreSQL (Supabase or Neon)

**Production uses Postgres only.** Create a project at [Supabase](https://supabase.com) or [Neon](https://neon.tech), set `DATABASE_URL`, run migrations. **Do not** deploy with `file:./dev.db`.

**Not used:** MongoDB, SQLite in production.

See `docs/DEPLOY.md` (C1).

---

## Current code (legacy local dev — being replaced)

Until C1 ships, the repo may still use:

- `provider = "sqlite"` in `prisma/schema.prisma`
- Prisma 7 + `@prisma/adapter-libsql`
- `prisma.config.ts` with `datasource: { url: 'file:./dev.db' }`
- `src/lib/db.ts` and `scripts/db.ts` with libsql adapter + `pathToFileURL()` for Windows

**New features should not depend on SQLite long-term.** Point local `.env` at a **dev Postgres** database when possible (Neon branch or Supabase second DB).

---

## Prisma 7 configuration

URL lives in `prisma.config.ts` via `defineConfig()`, not in `schema.prisma` datasource block.

**Postgres (target):**
```ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
```

**App client (target):**
```ts
import { PrismaClient } from '@prisma/client';
export const prisma = new PrismaClient();
```

No libsql adapter on Postgres.

---

## Why Asset.type is String (for now)

SQLite has no native enums. On Postgres you *may* add `enum AssetType { PHOTO VIDEO }` during C1 migration — optional; string + app validation still works.

---

## Models

(Unchanged — see prior docs. Cloud migration notes below.)

### Album

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| title | String | Display name |
| slug | String (unique) | URL identifier |
| relativePath | String? | Source folder under `media/wedding/` |
| coverAssetId | String? | Not wired to UI |
| sortOrder | Int | Album list order |
| isHidden | Boolean | Soft-hide |
| createdAt / updatedAt | DateTime | |

### Asset

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Used in URLs |
| type | String | `"PHOTO"` or `"VIDEO"` |
| albumId | String? | FK → Album |
| filename | String | |
| originalPath | String | **Server-only** — local path today; → R2 key in cloud |
| relativePath | String (unique) | Dedup key for import |
| extension, mimeType, fileSizeBytes | | |
| width, height, durationSeconds | | |
| thumbnailPath, posterPath | String? | Today: local paths; target: R2 keys or CDN URLs |
| takenAt, modifiedAt | DateTime | |
| isHidden, isHighlight, isAvailable | Boolean | |
| checksum | String? | Future dedup |

**Planned cloud fields (C2/C3):** `storageKey`, `thumbnailKey`, or denormalized `cdnThumbnailUrl` — add via migration when implementing R2.

### SiteSetting

| Field | Notes |
|---|---|
| guestPasswordHash | **Target:** bcrypt hash for C5 |
| requirePassword | true |
| appName, coupleNames, weddingDate | UI TBD |

### FuturePerson / FutureFaceMatch

Schema placeholders for v0.5 — unchanged.

---

## Migrations

**Postgres (production):**
```bash
npx prisma migrate deploy
```

**Local (legacy SQLite — until removed):**
```bash
npx prisma migrate dev --name <name>
```

After C1: delete or archive SQLite migrations if starting fresh on empty Postgres; or use `prisma db push` once for greenfield — team choice documented in CHANGELOG when done.

---

## Prisma Studio

```bash
npx prisma studio
```

Works against whichever `DATABASE_URL` is in `.env`.

---

## Setup checklist (developer)

1. Create Supabase or Neon project
2. Set `DATABASE_URL` in `.env` (and Vercel)
3. `npx prisma generate`
4. `npx prisma migrate deploy`
5. Remove libsql deps when C1 complete
6. Update `docs/DEPLOY.md` if connection pooling (Supabase pooler port 6543) is required for Vercel serverless

---

## Future schema evolution

- Face recognition tables (v0.5)
- `guestPasswordHash` wired in C5
- R2 storage keys on Asset (C2/C3)
