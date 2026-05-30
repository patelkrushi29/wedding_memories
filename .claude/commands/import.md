# /import

Run the media import script and report results.

Steps:
1. Check that `media/wedding/` exists and has files — if empty, tell the user how to add photos
2. Run `npm run import:media`
3. Parse the summary output (albums created, photos imported, videos imported, errors)
4. If errors > 0, show which files failed and why
5. Report: total albums, total photos, total videos, thumbnails generated
6. Tell the user to refresh the browser to see the imported media

If the script crashes, diagnose the error before reporting it.
