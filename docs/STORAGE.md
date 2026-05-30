# Storage

## Production target: Cloudflare R2 + CDN

**Default for go-live:** [Cloudflare R2](https://developers.cloudflare.com/r2/) (S3-compatible) with public or custom-domain CDN URLs.

**Why not Cloudinary at ~10k photos + ~10 hour-long videos:** storage and video bandwidth cost more than R2 for this library size. See `docs/DEPLOY.md`.

**Why not local disk in production:** Vercel has no persistent filesystem; ~50–90+ GB does not belong on the app server.

---

## StorageProvider Interface

`src/lib/storage/types.ts`:

```ts
export interface StorageProvider {
  getThumbnailUrl(asset: { id: string; thumbnailPath: string | null; filename: string }): string;
  getPosterUrl(asset: { id: string; posterPath: string | null; filename: string }): string;
  getPreviewUrl(asset: { id: string; relativePath: string }): string;
  getDownloadUrl(asset: { id: string }): string;
}
```

UI components use returned URLs only — never disk paths or R2 keys from the client.

---

## LocalStorageProvider (current — legacy dev)

**File:** `src/lib/storage/localStorageProvider.ts`

Routes media through Next.js API (reads from `public/generated/` and `originalPath` on disk):

| Method | Returns |
|---|---|
| `getThumbnailUrl` | `/api/media/${id}/thumbnail` |
| `getPosterUrl` | `/api/media/${id}/thumbnail` |
| `getPreviewUrl` | `/api/media/${id}/preview` |
| `getDownloadUrl` | `/api/media/${id}/download` |

**Status:** Not imported anywhere (dead code). Replace with R2 provider in C2/S6.

**Limitation:** Every thumbnail hits a serverless function — unacceptable at 10k assets in production.

---

## R2StorageProvider (to implement)

**File:** `src/lib/storage/r2StorageProvider.ts` (planned)

| Method | Returns (example) |
|---|---|
| `getThumbnailUrl` | `${R2_PUBLIC_BASE_URL}/thumbnails/${id}.webp` |
| `getPosterUrl` | `${R2_PUBLIC_BASE_URL}/posters/${id}.jpg` |
| `getPreviewUrl` | `${R2_PUBLIC_BASE_URL}/originals/...` or signed URL |
| `getDownloadUrl` | Same object with `Content-Disposition` via signed URL or proxy |

### Environment variables

```
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=wedding-media
R2_PUBLIC_BASE_URL=https://media.yourdomain.com
```

### Implementation notes

- Use AWS SDK v3 `S3Client` with R2 endpoint: `https://<account_id>.r2.cloudflarestorage.com`
- Import script uploads after sharp/ffmpeg processing
- DB stores **keys or public CDN paths**, not `C:\...` absolute paths
- **Videos:** `<video src={cdnUrl}>` with range requests from R2/CDN — not full file through `/api/media/.../preview` on Vercel

### Wiring

```ts
// src/lib/storage/index.ts (planned)
import { r2StorageProvider as storage } from './r2StorageProvider';
export { storage };
```

API routes and import script import `storage` for URL construction.

---

## Schema evolution for cloud

Consider adding (during C2/C3):

| Field | Purpose |
|-------|---------|
| `storageKey` | R2 object key |
| `thumbnailKey` | R2 thumb key |
| `cdnThumbnailUrl` | Denormalized CDN URL (optional) |

Keep `originalPath` server-only during transition, then remove or repurpose as `storageKey`.

---

## Provider comparison

| Provider | Use for this project |
|----------|----------------------|
| **Cloudflare R2** | **Yes** — primary |
| AWS S3 + CloudFront | Optional alternative |
| Supabase Storage | Optional; Postgres already on Supabase — not required |
| Cloudinary | Skip for default (cost at video scale) |
| Local disk / API routes | Dev only until R2 ships |

---

## Import script changes (C3)

1. Walk `MEDIA_ROOT` (local staging folder — owner still organizes folders there).
2. Generate thumbnail/poster locally with sharp/ffmpeg.
3. **Upload** original + thumb + poster to R2.
4. Upsert Postgres row with keys and CDN URLs.
5. Do not rely on `public/generated/` in production.

See `docs/MEDIA-IMPORT.md`.
