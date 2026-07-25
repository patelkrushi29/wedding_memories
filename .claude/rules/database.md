---
globs: prisma/**
---

# Rules for Prisma / Database

**Engine: PostgreSQL (Supabase).** No SQLite, no libsql adapter, no MongoDB. `src/lib/db.ts` and
`scripts/db.ts` both use `@prisma/adapter-pg` with `DATABASE_URL`.

> Vercel must use the Supabase **pooler** connection string. The direct
> `db.<ref>.supabase.co` host resolves to IPv6 only and fails there.

## The tag spine

`Tag` is self-referential and carries every grouping:

| kind | Meaning | Notes |
|---|---|---|
| `DAY` | A calendar day | Container only — carries **no** `AssetTag` rows; counts roll up from children |
| `FUNCTION` | Mehendi, Sangeet, Ceremony… | `parentId` → a DAY. Created hidden; the host names and publishes it |
| `MOMENT` | Sub-moment inside a function | Timestamp density, not yet generated |
| `PERSON` | A face cluster | Not yet generated |
| `OBJECT` | rings, decor, mandap… | CLIP-derived, not yet generated |

`isVisible: false` means guests never see it. Always filter guest queries on it.

## Asset

`type` is a plain String: `"PHOTO"` or `"VIDEO"` — uppercase.

Image tiers live in three columns: `thumbnailPath` (grid), `viewerPath` (viewer),
`originalPath` (full res). `blurDataUrl` is an inline base64 placeholder.
`source` is `"pro" | "guest"` and drives the "who shot it" facet.

## Guest-facing queries

Always: `where: { isHidden: false, isAvailable: true }`.

## Never expose paths

Strip `originalPath`, `thumbnailPath`, `viewerPath`, `posterPath` from every response —
`attachMediaUrls()` in `src/lib/storage/assetUrls.ts` does this for you. Use it.

## Migrations

```bash
npx prisma generate                              # after every schema change
npx prisma migrate dev --name describe_change     # writes + applies
npx prisma migrate deploy                         # production
```

Regenerate the client after pulling a schema change, or the build fails type-checking with
"property does not exist in type ...WhereInput".

## Models

Album, Asset, Tag, AssetTag, SiteSetting, FuturePerson, FutureFaceMatch (the last two are
unused placeholders — real face models land with the People work).
