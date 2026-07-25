import 'dotenv/config';
import { prisma } from './db';

async function main() {
  const total = await prisma.asset.count();
  const withTiers = await prisma.asset.count({
    where: { thumbnailPath: { not: null }, viewerPath: { not: null } },
  });
  const withDate = await prisma.asset.count({ where: { takenAt: { not: null } } });
  const sample = await prisma.asset.findFirst({
    where: { takenAt: { not: null } },
    select: { filename: true, takenAt: true, width: true, height: true },
    orderBy: { takenAt: 'asc' },
  });
  console.log(`assets: ${total} | thumb+viewer: ${withTiers} | EXIF date: ${withDate}`);
  if (sample) {
    console.log(`earliest: ${sample.filename} @ ${sample.takenAt?.toISOString()} (${sample.width}x${sample.height})`);
  }
  await prisma.$disconnect();
}

main();
