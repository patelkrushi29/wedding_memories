---
globs: src/app/api/**/*.ts
---

# Rules for API Routes

You are editing an API route. Follow these rules exactly.

## Required in every guest-facing query
```ts
where: { isHidden: false, isAvailable: true }
```

## Required for every list endpoint
Paginate with skip/take. Never return all records.
```ts
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '60');
const skip = (page - 1) * limit;
```

## Required response shape for lists
```ts
{ items, page, limit, total, hasMore: skip + items.length < total }
```

## Required for media URL construction
Always add these to asset objects in responses — never expose raw paths:
```ts
thumbnailUrl: `/api/media/${a.id}/thumbnail`,
previewUrl:   `/api/media/${a.id}/preview`,
downloadUrl:  `/api/media/${a.id}/download`,
```

## Security: strip these fields from every response
```ts
const { originalPath: _, thumbnailPath: _t, posterPath: _p, ...safe } = asset;
```

## Prisma client
```ts
import { prisma } from '@/lib/db';  // always — never new PrismaClient()
```

## Auth
API routes under `/api/*` are excluded from proxy.ts auth checks.
If a route needs protection, add the check inside the handler itself.
