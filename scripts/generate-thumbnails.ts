import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';

const prisma = new PrismaClient();
const THUMB_DIR = path.join(process.cwd(), 'public', 'generated', 'thumbnails');

async function main() {
  fs.mkdirSync(THUMB_DIR, { recursive: true });

  const assets = await prisma.asset.findMany({
    where: { thumbnailPath: null, originalPath: { not: '' } },
  });

  console.log(`Found ${assets.length} assets needing thumbnails`);
  let generated = 0;
  let errors = 0;

  for (const asset of assets) {
    if (asset.type !== 'PHOTO') continue;
    try {
      const thumbPath = path.join(THUMB_DIR, `${asset.id}.webp`);
      await sharp(asset.originalPath).resize(600).webp({ quality: 80 }).toFile(thumbPath);
      await prisma.asset.update({
        where: { id: asset.id },
        data: { thumbnailPath: `/generated/thumbnails/${asset.id}.webp` },
      });
      generated++;
    } catch (err) {
      console.error(`Error generating thumbnail for ${asset.filename}:`, err);
      errors++;
    }
  }

  console.log(`Generated: ${generated}, Errors: ${errors}`);
  await prisma.$disconnect();
}

main().catch(console.error);
