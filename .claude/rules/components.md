---
globs: src/components/**/*.tsx
---

# Rules for Components

**Design source:** the "Highlight reel" (B) frames on the redesign canvas · **Types:** `src/types/asset.ts`

You are editing a React component. These rules apply to all files in `src/components/`.

## Client vs Server
- Default to Server Components unless you need interactivity, browser APIs, or event handlers.
- Add `'use client'` only when necessary: onClick, useState, useEffect, useRef, browser APIs.

## Props and Types
- Always define a Props interface above the component.
- Do NOT define an `Asset` interface locally — import from `src/types/asset.ts`.

## Design tokens — "Highlight reel" (dark). Never use raw hex in components.
```css
--ink #0E0E10      /* page */
--pitch #000000    /* behind full-screen media */
--plate #1C1B1E    /* cards, sheets, inputs */
--plate-2 #242327  /* raised controls */
--veil #34323A     /* hairlines, borders */
--paper #F5F2EC    /* primary text */
--ash #A8A39A      /* secondary text */
--dim #858077      /* tertiary text (still 4.5:1 on ink) */
--accent #F4B23E   /* marigold — the next action only */
--accent-deep #3A2C12 /* accent tint fill (selected states) */
```
Tailwind: `bg-ink bg-plate bg-plate-2 border-veil text-paper text-ash text-dim text-accent bg-accent bg-accent-deep`.

## Type roles
| Class | Font | Used for |
|---|---|---|
| `.display` | Bricolage Grotesque 800, tight | Names, titles, big moments |
| default (`font-sans`) | DM Sans | Body, buttons, inputs |
| `.eyebrow` (+ `.eyebrow-on`) | DM Sans 600 uppercase | Small labels ("Friday · evening"); `-on` = accent |
| `.meta` | DM Sans, tabular numbers | Counts, times |

## Controls
`.btn` + `.btn-accent` (one per screen: the main action) or `.btn-ghost`. `.chip` / `.chip-on`
for filters. These live in `@layer components`, so utilities like `px-0` override them.

## Patterns
- Reels (`StoryReel`): photo shown whole over its own blurred fill; Keep / Add to post /
  Save to Photos on every slide.
- Bursts: grids show the best take with a layers badge; the viewer offers the other takes.
- Text over a photo always sits on `.scrim-b` / `.scrim-t`.
- In JSX, an expression followed by text containing an HTML entity (`&rsquo;`, `&amp;`…) can lose
  the space after it ("270photos", "5people" both shipped this way) — write `{n}{' '}photos`.

## Images — three tiers, never mix them up
- Grids: `asset.thumbnailUrl` with `loading="lazy"`. Never `next/image`.
- Viewer: `asset.previewUrl` (mid-size render, ~1600px).
- Full resolution: `asset.fullUrl` — only on a deliberate zoom or download.
- Always render `asset.blurDataUrl` as a background so nothing pops in white.

## Videos
- `preload="metadata"` — never `auto`.
- Video is a **filter inside a function**, never its own tab or page.

## Saved (the heart)
- localStorage key: `wedding-gallery-selected-assets`, managed in `src/lib/savedStore.ts`.
- Post basket: `wedding-post-basket` in `src/lib/postBasket.ts`, max 10.
- It is a **private** marker: no counts, nothing shown to other guests, no server record.

## Reusable surfaces
- `MediaGrid` — paginated grid + in-place viewer. Use it for any collection.
- `MediaCard` — 4:5 thumbnail, burst badge, no hover chrome (save/share live in the viewer).
- `AppShell` — page chrome (desktop nav + mobile tab bar). Pages own their headers.

## Tailwind
Tailwind v3 only. No v4-specific syntax.
