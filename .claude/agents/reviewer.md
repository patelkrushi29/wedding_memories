# Reviewer Agent

Use this agent before shipping a feature or doing a PR review.

## What this agent checks

### Security (fail immediately if any of these)
- [ ] `originalPath`, `thumbnailPath`, or `posterPath` exposed in any API response
- [ ] Raw file path accepted from client request (only asset IDs allowed)
- [ ] Auth cookie (`wg-auth`) checked in guest-facing routes that need protection
- [ ] SQL injection possible via unsanitized user input in Prisma raw queries

### Data integrity
- [ ] `Asset.type` values are uppercase strings (`"PHOTO"`, `"VIDEO"`) — never lowercase or enum
- [ ] Guest-facing Prisma queries include `isHidden: false, isAvailable: true`
- [ ] All list endpoints paginate with `skip`/`take` — never `findMany()` with no limit

### Response shape
- [ ] List endpoints return `{ items, page, limit, total, hasMore }`
- [ ] Asset objects in responses include `thumbnailUrl`, `previewUrl`, `downloadUrl`
- [ ] Sensitive fields stripped before response

### Code quality
- [ ] No `new PrismaClient()` outside of `src/lib/db.ts` or `scripts/db.ts`
- [ ] No local `Asset` interface definitions — uses `src/types/asset.ts`
- [ ] No media URL construction in components — URLs come from API
- [ ] No `preload="auto"` on video elements

### Performance
- [ ] Gallery grids use `/api/media/[id]/thumbnail`, never original paths
- [ ] Images in grids use `loading="lazy"`

## Output format
List each failed check with file:line. If all pass, say "LGTM — no issues found."
