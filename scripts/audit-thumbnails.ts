import 'dotenv/config';
import { prisma } from './db';
import { listR2Objects } from './r2';

async function main() {
  const objects = await listR2Objects('thumbnails/');
  const present = new Set(objects.map((o) => o.key));
  const webp = objects.filter((o) => o.key.endsWith('.webp'));

  const assets = await prisma.asset.findMany({
    select: { id: true, thumbnailPath: true, filename: true },
  });

  const missing = assets.filter((a) => !a.thumbnailPath || !present.has(a.thumbnailPath));
  const nullPath = assets.filter((a) => !a.thumbnailPath);

  console.log(`R2 thumbnails/: ${objects.length} objects (${webp.length} webp)`);
  console.log(`Assets: ${assets.length}`);
  console.log(`Assets whose thumbnailPath is missing from R2: ${missing.length}`);
  console.log(`Assets with no thumbnailPath at all: ${nullPath.length}`);
  if (missing.length) {
    console.log('\nFirst few missing:');
    for (const a of missing.slice(0, 5)) {
      console.log(`  ${a.filename} -> ${a.thumbnailPath ?? '(null)'}`);
    }
  }
  const orphans = webp.filter((o) => !assets.some((a) => a.thumbnailPath === o.key));
  console.log(`\nWebp objects not referenced by any asset: ${orphans.length}`);
  if (orphans.length) console.log(`  e.g. ${orphans.slice(0, 3).map((o) => o.key).join(', ')}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
