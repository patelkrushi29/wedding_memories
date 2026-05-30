# Roadmap

## Version 0.1 — Local MVP (current)

- [x] Password-gated gallery (cookie auth)
- [x] Media import from local folder structure
- [x] Album creation from folder names
- [x] Highlights album with `isHighlight` flag
- [x] Thumbnail generation (WebP, 600px wide via sharp)
- [x] Video poster generation (ffmpeg, 1s frame, graceful skip)
- [x] Paginated asset grid (default 60 items)
- [x] Photo lightbox (MediaViewerModal, keyboard nav)
- [x] Video playback in modal (range request streaming)
- [x] Favourites / Selected (localStorage, `/selected` page)
- [x] Filter and sort controls (FilterBar)
- [x] Admin reindex endpoint
- [x] StorageProvider abstraction for future cloud swap
- [x] Schema placeholders for FuturePerson + FutureFaceMatch

---

## Version 0.2 — Polish

- [ ] Better mobile viewer (swipe gestures in MediaViewerModal)
- [ ] Video poster generation improvements (smarter frame selection)
- [ ] ZIP download for selected assets (currently button exists but disabled)
- [ ] Album cover image admin UI
- [ ] `coupleNames` and `weddingDate` shown in TopNav / layout
- [ ] Toast notifications for favourite actions

---

## Version 0.3 — Scale & Reliability

- [ ] Scale testing with 10 000+ assets
- [ ] Thumbnail queue (background worker instead of blocking import)
- [ ] Import logging to database (track import runs, errors, timing)
- [ ] `checksum` field populated for deduplication
- [ ] Proper `photoCount` / `videoCount` split in album API response
- [ ] `/api/admin/reindex` progress endpoint (SSE or polling)

---

## Version 0.4 — Cloud & Production

- [ ] Supabase (Postgres + Auth + Storage)
- [ ] Cloudinary or S3 provider (swap via StorageProvider interface)
- [ ] Vercel deployment config
- [ ] Custom domain setup
- [ ] Cookie `secure` flag enabled (HTTPS)
- [ ] Rate limiting on auth endpoint
- [ ] `SiteSetting.guestPasswordHash` wired to bcrypt

---

## Version 0.5 — Face Recognition

- [ ] Face clustering (local or AWS Rekognition)
- [ ] FuturePerson admin UI (create person profiles)
- [ ] FutureFaceMatch approval workflow
- [ ] `/find-yourself` page — guest enters their name, sees photos with them
- [ ] Confidence threshold controls

---

## Version 0.6 — Memory Features

- [ ] Memory pages (curated story pages with photos + captions)
- [ ] Collage builder
- [ ] Short reels / highlight video generation
- [ ] Watermarking option for downloads
- [ ] Guest comments / reactions (requires Supabase or similar)
