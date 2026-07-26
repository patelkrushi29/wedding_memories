/**
 * Group the library by filename prefix. Camera-generated names carry the shooting
 * sequence even when EXIF has been stripped, and distinct prefixes usually mean
 * distinct cameras or photographers.
 */
import 'dotenv/config';
import { listR2Objects } from './r2';

async function main() {
  const names = (await listR2Objects('media/')).map((o) => o.key.replace('media/', ''));
  const groups = new Map<string, string[]>();

  for (const name of names) {
    const prefix = (name.match(/^[A-Za-z_]+/) ?? ['(none)'])[0];
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(name);
  }

  console.log(`${names.length} files, ${groups.size} filename prefix(es):\n`);
  for (const [prefix, list] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    const sorted = [...list].sort();
    console.log(`  "${prefix}"  ${list.length} files`);
    console.log(`     ${sorted[0]}  →  ${sorted[sorted.length - 1]}`);
  }

  const folders = new Set(names.filter((n) => n.includes('/')).map((n) => n.split('/')[0]));
  console.log(
    `\nSubfolders: ${folders.size ? [...folders].join(', ') : 'none — everything is flat'}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
