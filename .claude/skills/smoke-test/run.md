# Smoke Test Skill

Run a full smoke test of the running app and report pass/fail for each check.

## Prerequisite
Dev server must be running on port 3000. If not: `npm run dev` in background, wait for "Ready".

## Checklist

**Auth**
- GET /auth → 200
- GET /highlights without cookie → 302 to /auth
- POST /api/auth/guest-password with `{"password":"wedding"}` → `{"ok":true}`
- GET /highlights with valid cookie → 200

**Pages**
- GET /photos → 200
- GET /albums → 200
- GET /videos → 200
- GET /selected → 200
- GET /admin → 200
- GET /find-yourself → 200

**API**
- GET /api/albums → array (not error)
- GET /api/assets?limit=1 → `{items, total, hasMore}`
- GET /api/media/<first-asset-id>/thumbnail → image 200
- GET /api/media/<first-asset-id>/download → file 200

## Output
Print ✅ or ❌ for each. Summary: X/Y checks passed. List failures with actual HTTP status.
