# Testing Checklists

Use these checklists to verify the app works correctly after changes. Every task should pass the relevant checklist before being marked complete.

---

## Smoke Test (run after every change)

```
[ ] npm run dev starts without errors
[ ] http://localhost:3000 redirects to /auth
[ ] Password "wedding" logs in successfully
[ ] Redirected to /highlights after login
[ ] TopNav shows all links, "Find Yourself" is disabled
```

---

## Import & Data

```
[ ] npm run import:media completes without errors
[ ] Summary shows correct counts (imported, errors, albums)
[ ] Albums match folder names in media/wedding/
[ ] Highlights folder assets have isHighlight=true
[ ] Root-level files go to "All Media" album
[ ] Thumbnails generated in public/generated/thumbnails/
[ ] Re-running import doesn't create duplicates
[ ] Deleted files are marked isAvailable=false
```

### Import test data setup

Minimum test set:
```
media/wedding/
  Highlights/
    h1.jpg, h2.jpg, h3.jpg (3 photos)
  Ceremony/
    c1.jpg, c2.jpg (2 photos)
  Videos/
    v1.mp4 (1 video)
  standalone.jpg (1 root-level photo)
```

Expected result: 3 albums (Highlights, Ceremony, Videos) + 1 "All Media" album = 4 albums, 6 photos, 1 video.

---

## Pages

### Highlights (/highlights)
```
[ ] Shows photos from Highlights album
[ ] If no Highlights album, shows first 100 photos
[ ] Masonry grid layout looks correct
[ ] Images use thumbnails (not originals)
[ ] Lazy loading works (check network tab)
[ ] Clicking a photo opens MediaViewerModal
```

### Photos (/photos)
```
[ ] Shows all photos with count "Showing X of Y"
[ ] Search by filename works
[ ] Filter by album works
[ ] Sort options work (newest, oldest, album, filename)
[ ] "Load more" button appears when more photos exist
[ ] Loading skeleton shows while fetching
[ ] Empty state shows when no results
```

### Albums (/albums)
```
[ ] Shows all albums as cards
[ ] Each card shows: title, cover image, item count
[ ] Clicking card navigates to /albums/[slug]
[ ] Albums with no photos show placeholder
```

### Album Detail (/albums/[slug])
```
[ ] Shows album title and item count
[ ] Shows paginated grid of photos/videos
[ ] "Load more" works
```

### Videos (/videos)
```
[ ] Shows all video assets
[ ] Video cards show: filename, album badge, file size
[ ] Duration badge shows if duration is available
[ ] Play icon overlay visible
[ ] Clicking opens video in MediaViewerModal
[ ] Video plays in modal with controls
```

### Selected (/selected)
```
[ ] Shows empty state when nothing is selected
[ ] After favoriting photos, shows them here
[ ] Remove button (trash icon) removes from selection
[ ] "Clear all" removes everything
[ ] "Download as ZIP" button is disabled with "Coming soon"
[ ] Refreshing the page preserves selections (localStorage)
```

### Admin (/admin)
```
[ ] Shows photo count, video count, album count, total
[ ] "Reindex Media" button triggers re-import
[ ] Shows success/error message after reindex
[ ] Stats update after successful reindex
```

### Find Yourself (/find-yourself)
```
[ ] Shows "Coming Soon" placeholder
[ ] No errors or broken UI
```

---

## Media Viewer Modal

```
[ ] Opens when clicking a photo/video in any grid
[ ] Shows filename, album badge, file size in top bar
[ ] Download button downloads original file
[ ] Favorite button toggles heart state
[ ] Close button (X) closes modal
[ ] Clicking dark overlay closes modal
[ ] Escape key closes modal
[ ] Left arrow key goes to previous
[ ] Right arrow key goes to next
[ ] Left/right arrow buttons show when applicable
[ ] For videos: plays with HTML5 controls
[ ] For videos: autoPlay starts playback
```

---

## Auth

```
[ ] Unauthenticated users redirected to /auth
[ ] Wrong password shows error message
[ ] Correct password sets cookie and redirects to /highlights
[ ] After login, all pages accessible
[ ] API routes (/api/*) work without auth cookie
[ ] /auth page accessible without auth cookie
```

---

## Downloads

```
[ ] Download button triggers browser download
[ ] Downloaded file has original filename
[ ] Downloaded file is full resolution (not thumbnail)
[ ] 404 returned for non-existent asset ID
```

---

## Mobile (375px viewport)

```
[ ] Hamburger menu appears on mobile
[ ] Hamburger menu opens/closes correctly
[ ] All nav links work in mobile menu
[ ] Photo grid shows 2 columns on mobile
[ ] Video cards stack single-column on mobile
[ ] Media viewer is fullscreen on mobile
[ ] Prev/next arrows don't overlap content
[ ] Password form is usable on mobile
[ ] All buttons have adequate tap target size (44px+)
```

---

## Performance (with 100+ photos)

```
[ ] Page loads in under 3 seconds
[ ] Scroll is smooth (no jank)
[ ] Images load progressively (lazy loading)
[ ] Network tab shows thumbnails (small), not originals
[ ] Only current page of assets fetched (not all at once)
```
