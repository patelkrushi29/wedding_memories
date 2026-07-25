import 'dotenv/config';
import exifr from 'exifr';
import sharp from 'sharp';
import { prisma } from './db';
import { downloadFromR2 } from './r2';

async function main() {
  const assets = await prisma.asset.findMany({
    take: 3,
    orderBy: { filename: 'asc' },
    select: { filename: true, originalPath: true, fileSizeBytes: true, width: true, height: true },
  });

  for (const a of assets) {
    const buffer = await downloadFromR2(a.originalPath);
    const meta = await sharp(buffer).metadata();
    const exif = await exifr.parse(buffer).catch(() => null);
    console.log(`\n${a.filename}`);
    console.log(`  size: ${(a.fileSizeBytes / 1024).toFixed(0)} KB · ${meta.width}x${meta.height}`);
    console.log(`  exif present: ${exif ? Object.keys(exif).length + ' fields' : 'NONE'}`);
    if (exif) {
      console.log(`  camera: ${exif.Make ?? '?'} ${exif.Model ?? '?'} · taken: ${exif.DateTimeOriginal ?? exif.CreateDate ?? 'none'}`);
    }
  }

  const dims = await prisma.asset.groupBy({ by: ['width'], _count: { _all: true } });
  console.log(
    '\nwidths across library:',
    dims.map((d) => `${d.width}px×${d._count._all}`).join(', ')
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
