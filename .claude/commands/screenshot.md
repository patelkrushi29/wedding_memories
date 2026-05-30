# /screenshot

Take screenshots of all app pages and send them to the user.

Steps:
1. Check the dev server is running on port 3000 (curl http://localhost:3000/auth)
2. If not running, run `npm run dev` in the background and wait for "Ready"
3. Use puppeteer (already in node_modules) to capture screenshots
4. Write a Node script to /tmp/screenshot.js — require('puppeteer') from the project's node_modules
5. Capture these pages at 1440x900 (desktop):
   - /auth
   - /highlights (after login)
   - /photos
   - /albums
   - /videos
   - /selected
   - /admin
   - /find-yourself
   - Open first photo in viewer
6. Capture /highlights and /photos at 375x812 (mobile)
7. Save all to /tmp/*.png
8. Send all files to the user with SendUserFile

Run the script from the project directory so puppeteer resolves correctly:
`node /path/to/script.js` from `/home/user/wedding_memories`
