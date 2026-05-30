---
globs: prisma/**
---

# Rules for Prisma / Database

You are editing a Prisma schema or migration. Read these before touching anything.

## Prisma 7 — critical differences from tutorials

| Rule | Detail |
|---|---|
| No `url` in schema.prisma | URL lives in `prisma.config.ts` via `defineConfig()` — do NOT add it to schema |
| Adapter required | `@prisma/adapter-libsql` — required for all PrismaClient instances |
| Absolute URL required | `resolveDbUrl()` in `src/lib/db.ts` converts `file:./dev.db` → `file:///abs/path` |
| Type cast | `new PrismaClient({ adapter } as any)` — intentional, do not remove |

## Asset.type is a String, not an enum
SQLite has no native enums. `Asset.type` is declared as `String` in schema.prisma.
Always use uppercase string literals: `"PHOTO"` or `"VIDEO"`.
Never add a Prisma `enum` for this — it will break SQLite.

## Migrations
```bash
npx prisma migrate dev --name describe_change
```
After any schema change: regenerate the client:
```bash
npx prisma generate
```

## prisma.config.ts
The datasource URL lives here:
```ts
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: { url: 'file:./dev.db' },
});
```
Do NOT move the URL into schema.prisma.

## Schema models (summary)
- `Album` — slug, name, coverAssetId, isHidden, isAvailable
- `Asset` — albumId, type (String), originalPath, thumbnailPath, posterPath, isHidden, isAvailable, metadata
- `SiteSetting` — key/value store for runtime config
- `FuturePerson` / `FutureFaceMatch` — placeholders for v0.5 face recognition, do not touch

## Never expose originalPath
`Asset.originalPath` must never appear in API responses. Strip it in every route:
```ts
const { originalPath: _, thumbnailPath: _t, posterPath: _p, ...safe } = asset;
```
