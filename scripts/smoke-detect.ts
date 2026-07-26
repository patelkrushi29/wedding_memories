/**
 * Can we find people in these photographs, and are they big enough for their
 * clothing to be legible? Outfit-based grouping is worthless if the detector only
 * ever finds 40-pixel figures on a dance floor.
 */
import 'dotenv/config';
import { pipeline, RawImage, env } from '@huggingface/transformers';
import sharp from 'sharp';
import { prisma } from './db';
import { downloadFromR2 } from './r2';
import { configureLocalModels } from './clip';

configureLocalModels(env);

interface Detection {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

async function main() {
  const assets = await prisma.asset.findMany({
    where: { type: 'PHOTO', thumbnailPath: { not: null } },
    select: { filename: true, thumbnailPath: true },
    orderBy: { filename: 'asc' },
    take: 120,
  });
  const sample = assets.filter((_, i) => i % 20 === 0).slice(0, 6);

  const detector = await pipeline('object-detection', 'yolos-tiny', { dtype: 'q8' });
  console.log(`Detecting people in ${sample.length} photos:\n`);

  for (const asset of sample) {
    const buffer = await downloadFromR2(asset.thumbnailPath!);
    const { data, info } = await sharp(buffer)
      .rotate()
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const image = new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);

    const raw = (await detector(image, { threshold: 0.5 })) as unknown as Detection[];
    const people = raw
      .filter((d) => d.label === 'person')
      .map((d) => ({
        ...d,
        heightFraction: (d.box.ymax - d.box.ymin) / info.height,
      }))
      .sort((a, b) => b.heightFraction - a.heightFraction);

    const usable = people.filter((p) => p.heightFraction >= 0.25);
    console.log(
      `  ${asset.filename.padEnd(18)} ${info.width}x${info.height} · ` +
        `${String(people.length).padStart(2)} people · ${usable.length} usable · ` +
        `biggest ${(people[0]?.heightFraction ?? 0).toFixed(2)} of height`
    );
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
