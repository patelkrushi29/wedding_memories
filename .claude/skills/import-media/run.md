# Import Media Skill

Import wedding photos and videos from `media/wedding/` into the database and generate thumbnails.

## Steps
1. Check `media/wedding/` exists and has files
2. Run `npm run import:media`
3. Parse summary output (albums created, photos, videos, errors)
4. If errors > 0, show which files failed and why
5. Report totals and tell user to refresh the browser

## If the script crashes
- Check `scripts/import-media.ts` imports from `./db`, not `new PrismaClient()`
- Check `scripts/db.ts` exists
- Check `prisma.config.ts` exists at project root
