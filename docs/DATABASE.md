# Database

## Technology Decision: Prisma 7 + libsql

Prisma 7 removed the `url` field from the `datasource` block in `schema.prisma`. The database URL must now live in `prisma.config.ts` using the `defineConfig` helper. Locally the adapter used is `@prisma/adapter-libsql`, which accepts `{ url }` directly.

An additional wrinkle: libsql requires an **absolute** `file:///` URL. Relative paths like `file:./dev.db` are rejected. `src/lib/db.ts` contains a `resolveDbUrl()` function that converts any relative `file:` URL to `file:///abs/path/dev.db` using `path.resolve(process.cwd(), ...)`.

Config lives in `prisma.config.ts`:
```ts
export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  datasource: { url: 'file:./dev.db' },
});
```

## Why Asset.type Is String, Not Enum

Prisma's SQLite provider does not support native enum columns. Declaring `type` as an enum in the schema would cause a migration error. Instead `type` is a plain `String` and the import script enforces that only `"PHOTO"` or `"VIDEO"` are ever written. All query-side code uses `.toUpperCase()` when filtering by type.

## Models

### Album

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key |
| title | String | Display name, e.g. "Ceremony" |
| slug | String (unique) | URL-safe identifier, e.g. "ceremony" |
| relativePath | String? | Subfolder path relative to `media/wedding/` |
| coverAssetId | String? | Manual override for cover image (not yet wired to UI) |
| sortOrder | Int | Controls display order on /albums page |
| isHidden | Boolean | Soft-hide album from gallery |
| createdAt / updatedAt | DateTime | Auto-managed |
| assets | Asset[] | Relation — all assets in this album |

Indexes: `slug` (unique lookup), `isHidden` (filtering).

### Asset

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | Primary key, used in all media API URLs |
| type | String | `"PHOTO"` or `"VIDEO"` |
| albumId | String? | FK → Album |
| filename | String | Original filename |
| originalPath | String | Absolute path to source file on disk |
| relativePath | String (unique) | Path relative to `media/wedding/` — dedup key |
| extension | String | e.g. `.jpg`, `.mp4` |
| mimeType | String? | e.g. `image/jpeg` |
| fileSizeBytes | Int | Raw file size |
| width / height | Int? | Pixel dimensions (photos only) |
| durationSeconds | Float? | Video duration |
| thumbnailPath | String? | Relative URL stored in DB, e.g. `/generated/thumbnails/<id>.webp` |
| posterPath | String? | Video poster frame path |
| takenAt | DateTime? | EXIF date if present, otherwise null |
| modifiedAt | DateTime | File system mtime |
| isHidden | Boolean | Soft-hide from gallery |
| isHighlight | Boolean | True for assets in the `Highlights` folder |
| isAvailable | Boolean | Set false during re-import for missing files, then deleted |
| checksum | String? | Reserved for future dedup — not yet computed |
| createdAt / updatedAt | DateTime | Auto-managed |

Indexes and why they matter at 10 000+ assets:

| Index | Purpose |
|---|---|
| `type` | Filter photos vs videos without full scan |
| `albumId` | Fast album page load |
| `filename` | Keyword search |
| `takenAt` | Default sort (newest/oldest) |
| `modifiedAt` | Secondary sort fallback |
| `isHidden` | Exclude hidden assets in every query |
| `isAvailable` | Exclude missing files in every query |

### SiteSetting

Single-row configuration table (id is a cuid but only one row is expected).

| Field | Notes |
|---|---|
| appName | Defaults to "Wedding Memories" |
| coupleNames | Display names, not yet shown in UI |
| weddingDate | Not yet shown in UI |
| guestPasswordHash | Not used yet — auth compares plaintext via env var |
| requirePassword | Always true in current build |

### FuturePerson (schema-only placeholder)

| Field | Notes |
|---|---|
| id | cuid |
| displayName | Person's name for /find-yourself UI |
| coverAssetId | Profile photo asset |
| isVisible | Whether to show this person publicly |

### FutureFaceMatch (schema-only placeholder)

| Field | Notes |
|---|---|
| personId | FK → FuturePerson (enforced in app, not DB FK) |
| assetId | FK → Asset |
| boundingBoxJson | JSON string of face bounding box coordinates |
| confidence | 0–1 match confidence from recognition provider |
| provider | e.g. `"rekognition"`, `"local-clustering"` |
| externalFaceId | Provider's face ID for subsequent calls |
| isApproved | Admin approval before showing to guests |

## Running Migrations

```bash
npx prisma migrate dev --name <migration-name>
```

During development the `dev.db` file is created automatically on first run if it doesn't exist. To apply schema changes without resetting data:

```bash
npx prisma migrate dev
```

## Prisma Studio

```bash
npx prisma studio
```

Opens a browser-based GUI at `http://localhost:5555`. Useful for inspecting assets and albums during development.

## Future Schema Evolution

When face recognition is added:
1. Uncomment or extend `FuturePerson` and `FutureFaceMatch` — the models are already in the schema.
2. Add a proper foreign key from `FutureFaceMatch.personId → FuturePerson.id` (currently the relation is app-level only).
3. Add a `FutureFaceMatch` relation to `Asset` for reverse lookup.
4. Wire `SiteSetting.guestPasswordHash` to bcrypt — currently auth compares plaintext env var.
