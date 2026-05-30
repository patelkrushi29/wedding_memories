---
globs: prisma/**
---

# Rules for Prisma / Database

**Full docs:** `docs/DATABASE.md` · **Go-live:** `docs/DEPLOY.md` (C1)

## Target: PostgreSQL (Supabase or Neon)

- Production uses `DATABASE_URL` (Postgres). **No SQLite in production.**
- New work should implement C1 (Postgres), not extend SQLite-only paths.
- **Not used:** MongoDB.

## Current code (legacy dev until C1)

- `provider = "sqlite"` + `@prisma/adapter-libsql`
- URL in `prisma.config.ts`, not `schema.prisma`
- `src/lib/db.ts` and `scripts/db.ts` use adapter + `pathToFileURL()` on Windows
- `new PrismaClient({ adapter } as any)` — intentional for SQLite path

## Asset.type is String (not enum)

Use `"PHOTO"` / `"VIDEO"`. Optional Prisma enum only after Postgres migration.

## Migrations

```bash
npx prisma generate   # after every schema change
npx prisma migrate dev --name describe_change   # dev
npx prisma migrate deploy   # production Postgres
```

## Never expose originalPath

Strip in every API response:

```ts
const { originalPath: _, thumbnailPath: _t, posterPath: _p, ...safe } = asset;
```

## Models (summary)

Album, Asset, SiteSetting, FuturePerson, FutureFaceMatch — see `docs/DATABASE.md`.
