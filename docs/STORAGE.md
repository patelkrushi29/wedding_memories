# Storage

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

All four methods take a partial asset object and return a URL string. UI components call these methods and render the URL — they never construct file paths directly.

---

## LocalStorageProvider

**File:** `src/lib/storage/localStorageProvider.ts`

The current implementation. Routes all media through the Next.js API layer:

| Method | Returns |
|---|---|
| `getThumbnailUrl(asset)` | `/api/media/${asset.id}/thumbnail` |
| `getPosterUrl(asset)` | `/api/media/${asset.id}/thumbnail` (same endpoint — poster is stored as thumbnailPath) |
| `getPreviewUrl(asset)` | `/api/media/${asset.id}/preview` |
| `getDownloadUrl(asset)` | `/api/media/${asset.id}/download` |

The API endpoints look up the actual file path from the database on the server side. The client never knows or sends file paths.

Note: `posterPath` is not yet separately routed — videos store their poster frame path in both `posterPath` and `thumbnailPath`, so the thumbnail endpoint serves poster frames correctly.

---

## How to Add a Cloud Provider

1. Create a new file, e.g. `src/lib/storage/cloudinaryProvider.ts`.
2. Implement the `StorageProvider` interface:

```ts
import { StorageProvider } from './types';

export const cloudinaryProvider: StorageProvider = {
  getThumbnailUrl(asset) {
    // return a Cloudinary transformation URL, e.g.:
    return `https://res.cloudinary.com/<cloud>/image/upload/w_600,f_webp/${asset.id}`;
  },
  getPosterUrl(asset) {
    return `https://res.cloudinary.com/<cloud>/video/upload/so_1,f_jpg/${asset.id}`;
  },
  getPreviewUrl(asset) {
    return `https://res.cloudinary.com/<cloud>/image/upload/${asset.id}`;
  },
  getDownloadUrl(asset) {
    return `https://res.cloudinary.com/<cloud>/image/upload/fl_attachment/${asset.id}`;
  },
};
```

3. In whichever module currently imports `localStorageProvider`, swap the import:

```ts
// Before
import { localStorageProvider as storage } from '@/lib/storage/localStorageProvider';

// After
import { cloudinaryProvider as storage } from '@/lib/storage/cloudinaryProvider';
```

Because the interface is uniform, no UI component needs to change.

---

## Future Providers Planned

| Provider | Version | Notes |
|---|---|---|
| Cloudinary | v0.4 | Image transformations, CDN delivery |
| AWS S3 (or compatible) | v0.4 | Raw file storage, pre-signed download URLs |
| Supabase Storage | v0.4 | Combined with Supabase Auth and DB migration |

When adding a cloud provider, the import script (`scripts/import-media.ts`) will also need to be updated to upload files to the cloud and store the cloud asset ID / public ID in the database instead of (or alongside) `originalPath`.
