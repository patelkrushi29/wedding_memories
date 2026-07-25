---
globs: src/components/**/*.tsx
---

# Rules for Components

**Design source:** the Darkroom round-2 frames · **Types:** `src/types/asset.ts`

You are editing a React component. These rules apply to all files in `src/components/`.

## Client vs Server
- Default to Server Components unless you need interactivity, browser APIs, or event handlers.
- Add `'use client'` only when necessary: onClick, useState, useEffect, useRef, browser APIs.

## Props and Types
- Always define a Props interface above the component.
- Do NOT define an `Asset` interface locally — import from `src/types/asset.ts`.

## Design tokens — Darkroom (dark). Never use raw hex, never the old gold.
```css
--ink #15100D      /* page background */
--pitch #0C0907    /* deepest black */
--plate #1F1815    /* cards, panels, inputs */
--veil #2E2622     /* hairlines, borders */
--paper #F6EFE6    /* primary text */
--ash #A39287      /* secondary text */
--dim #6E625B      /* tertiary text, mono labels */
--halide #7ECFC2   /* the only accent (silver halide) */
--halide-d #2A4B47 /* accent fill */
```
Tailwind equivalents: `bg-ink bg-plate border-veil text-paper text-ash text-dim text-halide bg-halide-deep`.

## Type roles — three fonts, three jobs
| Class | Font | Used for |
|---|---|---|
| `.display` | Newsreader 300, italic for emphasis | Headings, function names. Never bold. |
| default (`font-sans`) | Instrument Sans | Body, buttons, inputs |
| `.mono` | IBM Plex Mono, uppercase, `.16em` tracking | Eyebrows, labels, "3 days · 5 functions" |
| `.numeral` | IBM Plex Mono, no uppercase | Counts, timecodes, filenames |

`.mono-on` turns a mono label halide. Use sparingly — it means "this is live/yours".

## Photographic texture
- `.grain` on a positioned parent adds film grain over imagery.
- `.sprockets` adds filmstrip rails to a horizontal strip.
- `.scrim-b` / `.scrim-t` for text legibility over photos.
- `.chip` / `.chip-on` for filter chips.

## Images — three tiers, never mix them up
- Grids: `asset.thumbnailUrl` with `loading="lazy"`. Never `next/image`.
- Viewer: `asset.previewUrl` (mid-size render, ~1600px).
- Full resolution: `asset.fullUrl` — only on a deliberate zoom or download.
- Always render `asset.blurDataUrl` as a background so nothing pops in white.

## Videos
- `preload="metadata"` — never `auto`.
- Video is a **filter inside a function**, never its own tab or page.

## Saved (the heart)
- localStorage key: `wedding-gallery-selected-assets`, managed in `FavoriteButton.tsx`.
- It is a **private** marker: no counts, nothing shown to other guests, no server record.

## Reusable surfaces
- `MediaGrid` — paginated grid + in-place viewer. Use it for any collection.
- `MediaCard` — bare thumbnail, no hover chrome (save/download live in the viewer).
- `AppShell` — page chrome (desktop nav + mobile tab bar). Pages own their headers.

## Tailwind
Tailwind v3 only. No v4-specific syntax.
