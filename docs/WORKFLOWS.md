# Workflows — Step-by-Step Recipes

Follow these recipes exactly when performing common tasks. They encode project-specific patterns and prevent known mistakes.

---

## Adding a new page

1. Create the page file at `src/app/<route>/page.tsx`
2. Decide: server component (data fetched via Prisma) or client component (`'use client'` with fetch calls)
   - Use **server component** if the page just displays data with no interactivity (like albums list)
   - Use **client component** if the page needs state, pagination, search, filters, or localStorage
3. Import shared types from `src/types/asset.ts` (do NOT define a new Asset interface)
4. Include `<TopNav />` at the top of the page
5. Wrap content in the standard layout:
   ```tsx
   <div className="min-h-screen bg-[#faf9f6]">
     <TopNav />
     <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
       {/* content */}
     </main>
   </div>
   ```
6. Add the route to `navLinks` in `src/components/TopNav.tsx` if it should appear in navigation
7. Test on both desktop and mobile viewport (375px width)
8. Update `docs/COMPONENTS.md` with the new page

---

## Adding a new API route

1. Create the route at `src/app/api/<path>/route.ts`
2. Import Prisma from `@/lib/db` — never create a new PrismaClient
3. API routes are excluded from auth middleware by default (middleware skips `/api/*`). If the route needs protection, add an auth check inside the handler.
4. For paginated endpoints, follow this pattern:
   ```ts
   const page = parseInt(searchParams.get('page') || '1');
   const limit = parseInt(searchParams.get('limit') || '60');
   const skip = (page - 1) * limit;
   
   const [items, total] = await Promise.all([
     prisma.asset.findMany({ where, skip, take: limit }),
     prisma.asset.count({ where }),
   ]);
   
   return NextResponse.json({
     items, page, limit, total,
     hasMore: skip + items.length < total,
   });
   ```
5. Always filter: `isHidden: false, isAvailable: true` for guest-facing queries
6. Add URL construction to response items:
   ```ts
   thumbnailUrl: `/api/media/${id}/thumbnail`,
   previewUrl: `/api/media/${id}/preview`,
   downloadUrl: `/api/media/${id}/download`,
   ```
7. Update `docs/API.md` with the new route
8. Test with curl or the browser network tab

---

## Modifying the database schema

1. Read `docs/DATABASE.md` first
2. Edit `prisma/schema.prisma`
3. Remember: SQLite has no native enums. Use String fields with app-level enforcement.
4. Run migration:
   ```bash
   npx prisma migrate dev --name <descriptive-name>
   ```
5. If the migration fails, check:
   - Is the field nullable? SQLite can't add a required column to a table with existing data without a default value
   - Are you using an unsupported SQLite feature? (enums, @db.JsonB, etc.)
6. Update `docs/DATABASE.md` with the new field/model
7. If you added a field to Asset, update the shared type in `src/types/asset.ts`
8. Check if the import script needs to populate the new field

**Do NOT:**
- Add `url` to the `datasource` block in `schema.prisma` — Prisma 7 uses `prisma.config.ts` for this
- Create a Prisma enum for SQLite — it will fail

---

## Modifying the import script

1. Read `docs/MEDIA-IMPORT.md` first
2. Edit `scripts/import-media.ts`
3. The script uses `new PrismaClient()` directly (not the app's singleton). This is correct for standalone scripts.
4. Test with a small dataset first (10-20 files)
5. Run: `npm run import:media`
6. Check the summary output
7. Verify in the app that new/changed data appears correctly
8. If you added a new field to Asset, make sure the import script populates it
9. Update `docs/MEDIA-IMPORT.md`

---

## Modifying auth or middleware

1. Read `docs/AUTH.md` first
2. The middleware is at `src/proxy.ts`
3. The cookie name is `wg-auth`, value is `authenticated`
4. Paths excluded from auth:
   - `/api/*` — all API routes
   - `/_next/*` — Next.js internals
   - `/generated/*` — thumbnail files
   - `/auth` — the login page itself
   - `/favicon.ico`
5. If you add a new public route (accessible without auth), add it to the exclusion list in middleware
6. After changes, test: (1) access a protected page while logged out → should redirect to /auth, (2) log in → should redirect to /highlights, (3) API routes still work without auth
7. Update `docs/AUTH.md`

---

## Modifying the UI design

1. Design tokens are in `src/app/globals.css`:
   - `--background: #faf9f6` (cream)
   - `--foreground: #2d2d2d`
   - `--gold: #c9a96e` (accent)
   - `--gold-light: #fdf7ef` (light accent)
2. Fonts: Playfair Display for `.font-serif` headings, Inter for body
3. All cards use: `bg-white rounded-xl shadow-sm hover:shadow-md`
4. The masonry grid is CSS columns defined in globals.css (`.masonry-grid`, `.masonry-item`)
5. Do not use enterprise/admin styling — the app should feel like a premium wedding gallery

**Design rules:**
- Large images, minimal chrome
- Soft shadows, rounded corners (xl)
- Gold accents for interactive elements
- Serif headings, sans-serif body
- White cards on cream background
- Smooth transitions (duration-200 or duration-300)

---

## Adding a UI component

1. Create in `src/components/<ComponentName>.tsx`
2. Use existing UI primitives from `src/components/ui/` (Button, Card, Badge, Dialog, etc.)
3. For icons, import from `lucide-react`
4. Use `cn()` from `@/lib/utils` for conditional classes
5. Follow the existing pattern:
   - Named export (not default)
   - Props interface defined above the component
   - `'use client'` directive if using hooks or event handlers
6. Update `docs/COMPONENTS.md`

---

## Testing a change manually

Before reporting any task as complete, verify:

### Basic smoke test
1. `npm run dev` starts without errors
2. Visit `http://localhost:3000` — redirects to `/auth`
3. Enter password "wedding" → redirects to `/highlights`
4. Navigate to each page via TopNav
5. Open a photo in the viewer, test arrow keys, Escape
6. Click download — file downloads with original filename
7. Favorite a photo, check `/selected`, unfavorite

### After schema changes
- Run `npx prisma migrate dev`
- Run `npm run import:media` to verify import still works
- Check the app displays the data correctly

### After import script changes
- Delete the DB: `rm prisma/dev.db`
- Run migration: `npx prisma migrate dev --name init`
- Run import: `npm run import:media`
- Verify output summary makes sense
- Check app for correct data

### After component changes
- Check the component on desktop (1280px+)
- Check on tablet (768px)
- Check on mobile (375px)
- Verify hover states work
- Verify keyboard navigation works (if applicable)

---

## Preparing for a version milestone

Before marking a version complete:

1. All tasks in the phase are done
2. App builds without errors: `npm run build`
3. TypeScript passes: `npx tsc --noEmit`
4. All pages load correctly
5. Import works with fresh database
6. README reflects current state
7. Docs are up to date (CLAUDE.md, relevant docs/ files)
8. DECISIONS.md is updated if new decisions were made
9. PLAN.md is updated with completed items
10. Changes committed and pushed
