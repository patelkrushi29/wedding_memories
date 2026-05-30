# /test

Run a smoke test of the running app and report pass/fail for each check.

The dev server must already be running (`npm run dev`). If it's not, start it first.

Run through this checklist using curl and report ✅ or ❌ for each:

**Auth**
- [ ] GET /auth returns 200
- [ ] GET /highlights without cookie redirects to /auth (302)
- [ ] POST /api/auth/guest-password with {"password":"wedding"} returns {"ok":true}
- [ ] GET /highlights with valid cookie returns 200

**Pages**
- [ ] GET /photos returns 200
- [ ] GET /albums returns 200
- [ ] GET /videos returns 200
- [ ] GET /selected returns 200
- [ ] GET /admin returns 200
- [ ] GET /find-yourself returns 200

**API**
- [ ] GET /api/albums returns array (not error)
- [ ] GET /api/assets?limit=1 returns {items, total, hasMore}
- [ ] GET /api/media/<first-asset-id>/thumbnail returns image (200)
- [ ] GET /api/media/<first-asset-id>/download returns file (200)

Print a summary: X/Y checks passed. List any failures with the actual HTTP status received.
