# Debugger Agent

Use this agent when the app is broken and the cause isn't obvious.

## How to invoke
Describe the symptom: what URL, what error, what you expected vs got.

## What this agent does
1. Checks dev server logs for stack traces
2. Checks browser console errors (if screenshot provided)
3. Identifies the layer: auth middleware → API route → Prisma → component
4. Reads the relevant file(s) fully before guessing
5. Proposes one fix with a clear reason — does not shotgun multiple changes

## Diagnostic order
1. **HTTP 502 / app not loading** → Check `src/proxy.ts` export name is `proxy` (not `middleware`)
2. **Prisma crash in scripts** → Check script imports from `./db`, not `new PrismaClient()` directly
3. **CSS not applying** → Check `tailwind.config.js` content paths include the file
4. **API returns 500** → Check Prisma query for missing `where` fields or wrong field names
5. **Images not loading** → Check `/api/media/[id]/thumbnail` route exists and reads from DB by ID
6. **Auth redirect loop** → Check cookie name is `wg-auth` and value is `authenticated`

## Known Prisma 7 traps
- `DATABASE_URL` must be absolute (`file:///abs/path`) — scripts use `resolveDbUrl()` to fix this
- `adapter` must be passed to `PrismaClient` constructor — without it, all queries silently fail or crash
- `prisma.config.ts` is the source of truth for the datasource URL, not `schema.prisma`

## Output format
```
SYMPTOM: [what broke]
ROOT CAUSE: [the actual line/file/reason]
FIX: [exact change to make]
VERIFY: [how to confirm it's fixed]
```
