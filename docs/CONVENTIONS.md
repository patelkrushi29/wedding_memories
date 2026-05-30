# Coding Conventions

Project-specific patterns that all code must follow. These are not preferences — they prevent specific bugs and inconsistencies in this codebase.

---

## TypeScript

### Shared types

All API response types used by multiple files must live in `src/types/`. Do NOT define local interfaces for Asset, Album, or other shared shapes in page files.

```ts
// CORRECT
import { Asset } from '@/types/asset';

// WRONG — creates drift when fields are added
interface Asset {
  id: string;
  // ...
}
```

### Asset.type values

Always use uppercase strings: `"PHOTO"` or `"VIDEO"`. When filtering from user input, normalize first:

```ts
if (type) where.type = type.toUpperCase();
```

---

## API Routes

### Always paginate

Every endpoint returning a list of assets MUST paginate. Never return all records.

```ts
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '60');
const skip = (page - 1) * limit;
```

### Always filter hidden/unavailable

Every guest-facing query MUST include:

```ts
where: { isHidden: false, isAvailable: true }
```

### Response shape

Paginated responses always return:

```ts
{ items: [], page: number, limit: number, total: number, hasMore: boolean }
```

### URL construction

Media URLs are always constructed server-side and included in API responses:

```ts
thumbnailUrl: `/api/media/${asset.id}/thumbnail`,
previewUrl: `/api/media/${asset.id}/preview`,
downloadUrl: `/api/media/${asset.id}/download`,
```

Never construct these URLs on the client side. Never expose `originalPath` or `thumbnailPath` to the client.

---

## Components

### Page layout pattern

Every page follows this structure:

```tsx
<div className="min-h-screen bg-[#faf9f6]">
  <TopNav />
  <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="mb-8">
      <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-gray-800">Page Title</h1>
      <p className="text-gray-500 mt-1">Subtitle</p>
    </div>
    {/* content */}
  </main>
</div>
```

### Media grid pattern

Photo grids use responsive columns:

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
```

Video grids use fewer, larger columns:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
```

The highlights page uses CSS masonry (`.masonry-grid`), not CSS grid.

### Media viewer pattern

All pages with media grids follow the same viewer pattern:

```tsx
const [viewerIndex, setViewerIndex] = useState<number | null>(null);
const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

// In grid: onClick={() => setViewerIndex(index)}

// At bottom of page:
{currentAsset && (
  <MediaViewerModal
    asset={currentAsset}
    onClose={() => setViewerIndex(null)}
    onPrev={viewerIndex! > 0 ? () => setViewerIndex(viewerIndex! - 1) : undefined}
    onNext={viewerIndex! < assets.length - 1 ? () => setViewerIndex(viewerIndex! + 1) : undefined}
    hasPrev={viewerIndex! > 0}
    hasNext={viewerIndex! < assets.length - 1}
  />
)}
```

### Load-more pagination pattern

```tsx
const [page, setPage] = useState(1);
const [hasMore, setHasMore] = useState(false);

const loadMore = () => {
  const next = page + 1;
  setPage(next);
  fetchAssets(next); // appends to existing assets
};

// At bottom of grid:
{hasMore && (
  <div className="mt-8 flex justify-center">
    <Button onClick={loadMore} disabled={loading} variant="outline">
      {loading ? 'Loading...' : 'Load more'}
    </Button>
  </div>
)}
```

---

## Styling

### Colors — use CSS variables or exact values

| Token | Value | Usage |
|---|---|---|
| Background | `#faf9f6` or `bg-[#faf9f6]` | Page background |
| Gold accent | `#c9a96e` or `text-[#c9a96e]` | Active nav, icons, accents |
| Gold light | `#fdf7ef` or `bg-[#fdf7ef]` | Active nav background, icon circles |
| Cards | `bg-white` | Card backgrounds |
| Headings | `text-gray-800` | Primary text |
| Body | `text-gray-600` | Secondary text |
| Muted | `text-gray-400` | Captions, counts |

### Cards

All cards: `rounded-xl shadow-sm hover:shadow-md transition-all duration-200`

### Headings

Page titles: `font-serif text-3xl sm:text-4xl font-semibold text-gray-800`

### Transitions

Use `duration-200` for interactive elements, `duration-300` for transforms (scale, position).

---

## Database / Prisma

### Singleton client in app code

Always import from `@/lib/db`:

```ts
import { prisma } from '@/lib/db';
```

Never create `new PrismaClient()` in app code (API routes, pages, components).

### New PrismaClient in scripts

Scripts (`scripts/*.ts`) run as standalone Node processes. They create their own `new PrismaClient()`. This is correct and expected.

### Migrations

Always name migrations descriptively:

```bash
npx prisma migrate dev --name add-video-duration-field
```

---

## Import script

### Thumbnail path format

Store as relative URL, not filesystem path:

```ts
thumbnailPath: `/generated/thumbnails/${assetId}.webp`
```

### Album slug generation

Use the `slugify` library with `{ lower: true, strict: true }`:

```ts
const slug = slugify(folderName, { lower: true, strict: true });
```

### Error handling

Catch errors per-file, log them, continue processing. Never let one bad file stop the entire import.

---

## File organization

| Type | Location |
|---|---|
| Page routes | `src/app/<route>/page.tsx` |
| API routes | `src/app/api/<path>/route.ts` |
| Shared components | `src/components/<Name>.tsx` |
| UI primitives | `src/components/ui/<name>.tsx` |
| Shared types | `src/types/<name>.ts` |
| Utilities | `src/lib/utils.ts` |
| Database client | `src/lib/db.ts` |
| Storage providers | `src/lib/storage/` |
| CLI scripts | `scripts/` |

### Naming

- Components: PascalCase (`MediaCard.tsx`)
- UI primitives: kebab-case (`dropdown-menu.tsx`)
- Utilities and libs: camelCase (`localStorageProvider.ts`)
- Types files: camelCase (`asset.ts`)
- API routes: `route.ts` (Next.js convention)

---

## Git

### What to commit

- All source code
- Configuration files
- Documentation updates
- Migration files (prisma/migrations/)

### What NOT to commit

- `media/` — wedding photos and videos
- `public/generated/` — generated thumbnails
- `.env` — environment secrets
- `*.db` — SQLite database files
- `node_modules/`

### Commit messages

- Use present tense imperative: "Add video duration to import" not "Added" or "Adds"
- First line under 72 characters
- Reference the task: "Fix photoCount in albums API (S3)" if from the plan
