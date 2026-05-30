# Components

## Page Components (src/app/**/page.tsx)

These are React Server Components or client pages — they fetch data and render the layout.

| Page | Route | Notes |
|---|---|---|
| `app/page.tsx` | `/` | Redirects to `/highlights` |
| `app/highlights/page.tsx` | `/highlights` | Fetches assets where `isHighlight=true` |
| `app/photos/page.tsx` | `/photos` | Fetches all `type=PHOTO` assets, paginated |
| `app/videos/page.tsx` | `/videos` | Fetches all `type=VIDEO` assets |
| `app/albums/page.tsx` | `/albums` | Lists all albums via `GET /api/albums` |
| `app/albums/[slug]/page.tsx` | `/albums/:slug` | Album detail, paginated assets |
| `app/selected/page.tsx` | `/selected` | Reads localStorage IDs, fetches those assets via `?ids=` |
| `app/find-yourself/page.tsx` | `/find-yourself` | Coming-soon placeholder |
| `app/auth/page.tsx` | `/auth` | Password form |
| `app/admin/page.tsx` | `/admin` | Reindex trigger button |

---

## Shared Components (src/components/)

### TopNav

**File:** `src/components/TopNav.tsx`

**Purpose:** Sticky header with navigation links. Client component (uses `usePathname`).

**Nav links:**
- Highlights, Photos, Albums, Videos, Selected — all active links
- Find Yourself — rendered but disabled (`cursor-not-allowed`, click prevented, title="Coming soon")

**No props.** Reads `usePathname()` to highlight the active link.

---

### MediaCard

**File:** `src/components/MediaCard.tsx`

**Purpose:** Photo thumbnail card used in grid views.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `asset` | `{ id, filename, thumbnailUrl, downloadUrl, width?, height? }` | |
| `onClick` | `() => void` | Opens the media viewer modal |

**Key behavior:**
- Always displays `thumbnailUrl` — never the original.
- Hover overlay shows `FavoriteButton` and a download link.
- Download link uses the `download` attribute — triggers browser download.

---

### VideoCard

**File:** `src/components/VideoCard.tsx`

**Purpose:** Video thumbnail card. Similar to MediaCard but adds a duration badge and play icon overlay.

**Props:** Same shape as MediaCard plus `durationSeconds?: number | null`.

---

### MediaViewerModal

**File:** `src/components/MediaViewerModal.tsx`

**Purpose:** Fullscreen lightbox for viewing a single photo or video.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `asset` | `Asset \| null` | Null closes/hides the modal |
| `onClose` | `() => void` | |
| `onPrev` | `() => void` | Optional |
| `onNext` | `() => void` | Optional |
| `hasPrev` | `boolean` | Shows left arrow |
| `hasNext` | `boolean` | Shows right arrow |

**Key behavior:**
- Renders `null` if `asset` is null (unmounts cleanly).
- **Photo mode:** Renders `<img>` with `src={asset.previewUrl}` — uses the original file for full quality.
- **Video mode:** Renders `<video>` with `src={asset.previewUrl}`, autoPlay, controls.
- **Keyboard navigation:** `Escape` → close, `ArrowLeft` → prev, `ArrowRight` → next. Listeners attached with `useEffect`, cleaned up on unmount.
- Click outside the media area (on the dark overlay) → closes the modal.
- Top bar: filename, album badge, file size, `FavoriteButton`, download link, close button.

---

### FavoriteButton

**File:** `src/components/FavoriteButton.tsx`

**Purpose:** Heart toggle that saves/removes an asset ID from localStorage.

**Props:**
| Prop | Type | Notes |
|---|---|---|
| `assetId` | `string` | |
| `className` | `string?` | |
| `size` | `'default' \| 'sm'` | Default = `'default'` |

**State:** `selected: boolean` — initialised from localStorage on mount.

**Storage key:** `wedding-gallery-selected-assets` — JSON array of asset ID strings.

**Key behavior:**
- `useEffect` on mount reads localStorage to set initial heart state. Handles SSR (localStorage only available client-side).
- `toggle()` reads, mutates, and writes the array atomically. Stops click propagation so clicking the heart doesn't open the viewer.
- `/selected` page also reads the same localStorage key and fetches those IDs via `GET /api/assets?ids=<csv>`.

---

### AlbumCard

**File:** `src/components/AlbumCard.tsx`

**Purpose:** Album grid card linking to `/albums/[slug]`.

**Props:** `{ id, title, slug, totalCount, coverThumbnailUrl: string | null }`

---

### FilterBar

**File:** `src/components/FilterBar.tsx`

**Purpose:** Sort and filter controls rendered above media grids.

Emits sort/filter change events upward via callback props. The parent page component holds the current filter state and passes it to API requests.

---

### EmptyState

**File:** `src/components/EmptyState.tsx`

**Purpose:** Centred empty state with icon and message, shown when a grid has no results.

**Props:** `{ title: string, description?: string }`

---

### LoadingGrid

**File:** `src/components/LoadingGrid.tsx`

**Purpose:** Skeleton grid shown while data is loading. Uses `Skeleton` UI primitive.

---

## UI Primitives (src/components/ui/)

These are **hand-built Radix UI wrappers** — they were written manually because the shadcn CLI registry was unreachable during initial development. They use the same underlying libraries shadcn uses (Radix UI + class-variance-authority) and follow the same API conventions, but were not generated by the CLI.

| File | Radix primitive | Notes |
|---|---|---|
| `button.tsx` | None (native `<button>`) | `variant` and `size` via CVA |
| `badge.tsx` | None (native `<span>`) | `variant` via CVA |
| `card.tsx` | None (native divs) | `Card`, `CardHeader`, `CardContent`, `CardTitle` |
| `dialog.tsx` | `@radix-ui/react-dialog` | `Dialog`, `DialogContent`, `DialogTitle`, etc. |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | `DropdownMenu`, `DropdownMenuTrigger`, etc. |
| `input.tsx` | None (native `<input>`) | Styled input with focus ring |
| `skeleton.tsx` | None (native `<div>`) | Animated shimmer placeholder |
| `toast.tsx` | None (custom) | Basic toast notification |

To add a new UI primitive: create a new file in `src/components/ui/`, wrap the relevant Radix primitive, export named components following the existing patterns.

---

## State: localStorage vs Server

| Data | Location | Key / endpoint |
|---|---|---|
| Selected/favourite asset IDs | localStorage | `wedding-gallery-selected-assets` |
| Auth status | httpOnly cookie | `wg-auth=authenticated` |
| Albums | Server (SQLite) | `GET /api/albums` |
| Assets | Server (SQLite) | `GET /api/assets` |
| Current page / filters | React state (in-memory) | Resets on navigation |
