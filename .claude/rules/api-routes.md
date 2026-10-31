---
globs: src/app/api/**/*.ts
---

# Rules for API Routes

## Required in every guest-facing query
```ts
where: { isHidden: false, isAvailable: true }
```
Tag-filtered queries must also require `tag: { isVisible: true }` — unpublished functions are
invisible to guests.

## Pagination
Cursor-based is the default for galleries; `page`/`skip` is kept for back-compat.
```ts
const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '60') || 60));
const cursor = searchParams.get('cursor');
// ...take: limit, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : { skip })
```
Order by a stable pair (`takenAt` + `id`) or cursoring drifts.

Response shape:
```ts
{ items, page, limit, total, hasMore, nextCursor }
```

## Media URLs — never build them by hand
```ts
import { attachMediaUrls } from '@/lib/storage/assetUrls';
return NextResponse.json({ items: items.map(attachMediaUrls) });
```
It attaches `thumbnailUrl` / `previewUrl` / `fullUrl` / `downloadUrl` and strips
`originalPath`, `thumbnailPath`, `viewerPath`, `posterPath`. Never expose a raw key or path.

## Prisma client
```ts
import { prisma } from '@/lib/db';  // always
```

## Auth
`src/proxy.ts` requires a valid guest session for every `/api/*` route except `/api/auth/*`,
and answers 401 JSON (not a redirect) so client code can tell signed-out from empty.
`/api/admin/*` skips the guest gate and authenticates itself.

Return the trimmed client shape (`toClientAsset(attachMediaUrls(row))`) and use
`omit: GUEST_ASSET_OMIT` — never send embeddings or internal flags to a browser.

Admin routes must call `isAdminAuthorized(request)` from `@/lib/adminAuth`: open in dev,
`Bearer ADMIN_REINDEX_SECRET` in production, and it refuses the placeholder value `change-me`.

Do not export helpers from a route file — App Router only allows HTTP verb exports. Put shared
logic in `src/lib/`.
