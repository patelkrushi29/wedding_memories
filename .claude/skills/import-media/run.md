# Import Media Skill

Import wedding photos/videos from `media/wedding/` into the database and generate thumbnails.

**Docs:** `docs/MEDIA-IMPORT.md` · **Cloud target:** `docs/DEPLOY.md` C3 (R2 + Postgres)

## Steps
1. Ensure `media/wedding/` exists and has files (owner staging folder)
2. `npx prisma generate` if schema changed
3. Run `npm run import:media`
4. Parse summary (albums, photos, videos, errors)
5. If errors > 0, list failed files
6. Tell user to refresh browser or check Vercel deploy

## If the script crashes
- Import must use `import { prisma } from './db'` in `scripts/import-media.ts`
- Windows: `pathToFileURL` in `scripts/db.ts` for SQLite dev
- Production: `DATABASE_URL` must be Postgres (see DEPLOY C1)
