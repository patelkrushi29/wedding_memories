# API Routes

All API routes are excluded from middleware auth checks. Individual routes that need protection implement their own checks (see Admin section below).

## Albums

### GET /api/albums

Returns all visible albums with asset counts and cover thumbnail.

**Auth required:** No (middleware bypasses `/api/*`)

**Response:**
```json
[
  {
    "id": "cuid",
    "title": "Ceremony",
    "slug": "ceremony",
    "photoCount": 0,
    "videoCount": 0,
    "totalCount": 142,
    "coverThumbnailUrl": "/api/media/<id>/thumbnail"
  }
]
```

Note: `photoCount` and `videoCount` are always `0` in the current implementation — only `totalCount` is populated.

---

### GET /api/albums/[slug]

Returns album metadata plus a paginated list of its assets.

**Auth required:** No

**Query params:**

| Param | Default | Notes |
|---|---|---|
| `page` | 1 | Page number (1-based) |
| `limit` | 60 | Items per page |

**Response:**
```json
{
  "album": { "id": "...", "title": "...", "slug": "..." },
  "assets": [ { ...asset, "thumbnailUrl": "...", "previewUrl": "...", "downloadUrl": "..." } ],
  "page": 1,
  "limit": 60,
  "total": 142,
  "hasMore": true
}
```

Assets are ordered by `takenAt` ascending (chronological).

---

## Assets

### GET /api/assets

Filterable, paginated list of all available, non-hidden assets.

**Auth required:** No

**Query params:**

| Param | Description |
|---|---|
| `type` | `PHOTO` or `VIDEO` (case-insensitive) |
| `album` | Filter by album slug |
| `search` | Filename contains search |
| `sort` | `newest` (default), `oldest`, `album`, `filename` |
| `page` | Page number, default 1 |
| `limit` | Items per page, default 60 |
| `ids` | Comma-separated asset IDs (for Selected page) |

**Response:**
```json
{
  "items": [
    {
      "id": "...",
      "type": "PHOTO",
      "filename": "DSC_001.jpg",
      "thumbnailUrl": "/api/media/<id>/thumbnail",
      "previewUrl": "/api/media/<id>/preview",
      "downloadUrl": "/api/media/<id>/download",
      "album": { "title": "Ceremony", "slug": "ceremony" },
      ...all other Asset fields
    }
  ],
  "page": 1,
  "limit": 60,
  "total": 842,
  "hasMore": true
}
```

---

## Media serving

All three media endpoints resolve the asset by **ID only** — they never accept a raw file path from the client. The DB record's `originalPath` or `thumbnailPath` is used server-side to locate the file.

### GET /api/media/[id]/thumbnail

Serves the pre-generated webp thumbnail from `public/generated/thumbnails/`.

- If no thumbnail exists → returns an SVG placeholder (heart icon, cream background).
- Response includes `Cache-Control: public, max-age=31536000, immutable`.

---

### GET /api/media/[id]/preview

Streams the original file for in-browser viewing. Supports HTTP Range requests (required for `<video>` seeking).

- Returns 206 Partial Content for range requests.
- Returns full file with `Cache-Control: public, max-age=3600` otherwise.
- Returns 404 JSON if asset not found or file missing from disk.

---

### GET /api/media/[id]/download

Forces a download of the original file.

- Sets `Content-Disposition: attachment; filename="<original filename>"`.
- Returns 404 JSON if asset not found or file missing from disk.
- **Security:** Client only supplies the asset ID. The file path is never accepted from or exposed to the client.

---

## Auth

### POST /api/auth/guest-password

Validates the guest password and sets the auth cookie.

**Request body:** `{ "password": "..." }`

**Success response (200):**
```json
{ "ok": true }
```
Sets cookie: `wg-auth=authenticated; httpOnly; path=/; maxAge=2592000`

**Failure response (401):**
```json
{ "ok": false, "error": "Invalid password" }
```

The correct password is `process.env.GUEST_PASSWORD` (default: `"wedding"`).

---

## Admin

### POST /api/admin/reindex

Triggers a full media re-import by running `scripts/import-media.ts` via `execSync`.

**Protection:**
- In `NODE_ENV=development`: no auth required.
- In production: requires `Authorization: Bearer <ADMIN_REINDEX_SECRET>` header. The secret is `process.env.ADMIN_REINDEX_SECRET` (default: `"local-admin-secret"`).

**Request:** No body required.

**Success response:**
```json
{ "ok": true, "message": "Reindex complete" }
```

**Error response (500):**
```json
{ "ok": false, "error": "..." }
```

Timeout: 120 seconds (the import script can be slow for large libraries).
