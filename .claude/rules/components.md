---
globs: src/components/**/*.tsx
---

# Rules for Components

You are editing a React component. These rules apply to all files in `src/components/`.

## Client vs Server
- Default to Server Components unless you need interactivity, browser APIs, or event handlers.
- Add `'use client'` only when necessary: onClick, useState, useEffect, useRef, browser APIs.

## Props and Types
- Always define a Props interface above the component.
- Do NOT define an `Asset` interface locally — import from `src/types/asset.ts`.
```ts
import type { Asset } from '@/types/asset';
```

## Media URLs
- Never construct media URLs in components. They come from the API response.
- Use `asset.thumbnailUrl`, `asset.previewUrl`, `asset.downloadUrl` — never `/api/media/${id}/...`.

## Images
- Always use `<img>` with `loading="lazy"` for gallery grids, not `next/image` (masonry layout incompatible).
- In lightbox/viewer: `<img>` with eager loading is fine.

## Videos
- Always use `preload="metadata"` — never `preload="auto"`.

## Favorites / Selected
- localStorage key: `wedding-gallery-selected-assets`
- Managed in `src/components/FavoriteButton.tsx` — don't duplicate this logic.

## Design tokens (use these, never raw colors)
```css
var(--background)   /* #faf9f6 warm white */
var(--foreground)   /* #2d2d2d near-black */
var(--gold)         /* #c9a96e gold accent */
var(--gold-light)   /* #fdf7ef gold tint */
```

## Tailwind
- Use Tailwind v3 class names only. No v4-specific syntax.
- Use `font-serif` for headings, `font-sans` for body.
