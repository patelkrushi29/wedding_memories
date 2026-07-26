/**
 * Upload a local folder of originals into R2 under `media/`, preserving folder
 * structure. Nothing else — no thumbnails, no database rows.
 *
 * `sync:r2` is the single owner of everything derived (thumbnail, viewer render,
 * blur placeholder, EXIF, album, rows). Splitting them this way means there is
 * only one place where a tier can be forgotten.
 *
 * Usage:
 *   npm run upload:r2 -- --from "D:/Wedding/originals"
 *   npm run upload:r2 -- --from ./media/wedding --dry
 *
 * Then: npm run sync:r2 && npm run cluster:events
 */
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { isR2Configured, listR2Objects, uploadToR2 } from './r2';

const MEDIA_EXTS = new Set([
  '.jpg', '.jpeg', '.png', '.webp', '.gif',
  '.mp4', '.mov', '.m4v', '.webm',
]);

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime',
  '.m4v': 'video/x-m4v', '.webm': 'video/webm',
};

const fromArg = process.argv.find((a) => a.startsWith('--from='));
const fromFlagIndex = process.argv.indexOf('--from');
const root =
  (fromArg ? fromArg.split('=').slice(1).join('=') : null) ??
  (fromFlagIndex > -1 ? process.argv[fromFlagIndex + 1] : null) ??
  process.env.MEDIA_ROOT ??
  './media/wedding';
const dry = process.argv.includes('--dry');

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && MEDIA_EXTS.has(path.extname(entry.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

async function main() {
  if (!isR2Configured()) {
    console.error(
      'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL.'
    );
    process.exit(1);
  }
  if (!fs.existsSync(root)) {
    console.error(`Folder not found: ${path.resolve(root)}`);
    console.error('Pass one with --from "C:/path/to/originals"');
    process.exit(1);
  }

  const files = walk(root);
  if (files.length === 0) {
    console.log(`No media files under ${path.resolve(root)}`);
    return;
  }

  const totalBytes = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  console.log(`Found ${files.length} files (${(totalBytes / 1024 ** 3).toFixed(2)} GB) in ${path.resolve(root)}`);

  // Subfolders become part of the key, which is how sync derives album names
  const existing = new Set((await listR2Objects('media/')).map((o) => o.key));
  console.log(`${existing.size} objects already in R2 media/`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;
  let bytesDone = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relative = path.relative(root, file).split(path.sep).join('/');
    const key = `media/${relative}`;
    const size = fs.statSync(file).size;

    if (existing.has(key)) {
      skipped++;
      bytesDone += size;
      continue;
    }
    if (dry) {
      console.log(`  would upload ${key}`);
      continue;
    }

    try {
      const body = fs.readFileSync(file);
      const contentType = MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
      await uploadToR2(key, body, contentType);
      uploaded++;
      bytesDone += size;
    } catch (err) {
      failed++;
      console.error(`  failed ${key}: ${err instanceof Error ? err.message : String(err)}`);
    }

    if ((i + 1) % 25 === 0 || i === files.length - 1) {
      const pct = ((bytesDone / totalBytes) * 100).toFixed(0);
      console.log(`  ${i + 1}/${files.length} · ${pct}% of bytes · ${uploaded} uploaded, ${skipped} already there`);
    }
  }

  console.log(`\nUpload complete: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
  if (!dry && uploaded > 0) {
    console.log('Next: npm run sync:r2 && npm run cluster:events');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
