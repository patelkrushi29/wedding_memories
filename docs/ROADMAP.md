# Roadmap

## Version 0.1 — App MVP (current code)

- [x] Password-gated gallery (cookie auth)
- [x] Media import from local folder structure
- [x] Album creation from folder names
- [x] Highlights, photos, videos, albums, selected
- [x] Thumbnail generation (sharp), video posters (ffmpeg)
- [x] Paginated grids, lightbox, favorites (localStorage)
- [x] Admin reindex (local)
- [x] StorageProvider interface (not wired)
- [x] Face recognition schema placeholders
- [x] `next/font` (Playfair Display + Inter)

**Note:** v0.1 code uses **SQLite + local disk**. This is **not** the production target.

---

## Version 0.2 — Cloud production (target go-live)

See `docs/DEPLOY.md` for account setup and env vars.

- [ ] **PostgreSQL** (Supabase or Neon) — **no SQLite in production**
- [ ] **Cloudflare R2** + CDN for all media
- [ ] Import script uploads to R2 (~10k photos, long videos)
- [ ] **Vercel** deploy + **custom domain**
- [ ] Production auth: bcrypt, `Secure` cookies, rate limits
- [ ] **Family view link** (passwordless for parents)
- [ ] Stabilization S2–S6 (types, album counts, admin stats, StorageProvider)
- [ ] Owner import only — **no guest uploads**

---

## Version 0.3 — Polish & scale

- [ ] Mobile viewer improvements (swipe)
- [ ] ZIP download for selected assets
- [ ] Album cover admin UI
- [ ] `coupleNames` / `weddingDate` in layout
- [ ] Toast notifications
- [ ] Scale validation: full 10k library on R2/CDN
- [ ] Import progress, batching, checksum dedup
- [ ] Infinite scroll (optional)

---

## Version 0.4 — Optional enhancements

(Items previously listed as “cloud” — moved to v0.2. v0.4 is extras.)

- [ ] Supabase Auth (if replacing custom password gate)
- [ ] `/api/admin/reindex` progress (SSE/polling)
- [ ] Video duration on import (ffprobe)
- [ ] Search/filter on album detail page

---

## Version 0.5 — Face Recognition

- [ ] Face clustering
- [ ] Admin review UI
- [ ] `/find-yourself` live

---

## Version 0.6 — Memory Features

- [ ] Memory pages, collages, reels
- [ ] Guest comments/reactions (needs backend — not phase 1)
- [ ] **Guest uploads** (evaluate here or later)

---

## Explicitly not planned for v0.2

- MongoDB
- Cloudinary as primary storage
- SQLite `dev.db` in production
- Local-only media serving at 10k+ scale
