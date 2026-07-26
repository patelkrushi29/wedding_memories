/**
 * Compute a CLIP image embedding for every photo and store it on the asset.
 *
 * Reads the 600px **thumbnail**, not the original. CLIP downsamples to 224px
 * regardless, so fetching originals would move gigabytes of R2 egress to produce
 * an identical vector — for 10,000 camera files that is ~80 GB versus ~320 MB.
 *
 * Resumable: only photos with no embedding are processed, so an interrupted run
 * continues where it stopped.
 *
 * Usage:
 *   npm run embed          # everything missing an embedding
 *   npm run embed -- --limit=50
 *   npm run embed -- --force   # recompute all (after a model change)
 */
import 'dotenv/config';
import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
} from '@huggingface/transformers';
import sharp from 'sharp';
import { prisma } from './db';
import { downloadFromR2 } from './r2';
import { MODEL_ID, configureLocalModels, normalize } from './clip';

configureLocalModels(env);

const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
const FORCE = process.argv.includes('--force');

async function main() {
  // Postgres leaves the added array column NULL, and Prisma's isEmpty filter does
  // not match NULL — so embeddedAt is the marker for "not done yet".
  const assets = await prisma.asset.findMany({
    where: {
      type: 'PHOTO',
      isAvailable: true,
      ...(FORCE ? {} : { embeddedAt: null }),
    },
    select: { id: true, filename: true, thumbnailPath: true, originalPath: true },
    orderBy: { filename: 'asc' },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  if (assets.length === 0) {
    console.log('Every photo already has an embedding. Use --force to recompute.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Embedding ${assets.length} photo(s) with ${MODEL_ID}…`);
  const processor = await AutoProcessor.from_pretrained(MODEL_ID);
  const model = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, { dtype: 'q8' });

  let done = 0;
  let failed = 0;
  const started = Date.now();

  for (const asset of assets) {
    try {
      // Thumbnail when we have one; the original is the fallback
      const key = asset.thumbnailPath ?? asset.originalPath;
      const buffer = await downloadFromR2(key);

      const { data, info } = await sharp(buffer)
        .rotate()
        .resize(224, 224, { fit: 'cover' })
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const image = new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);
      const inputs = await processor(image);
      const { image_embeds } = await model(inputs);

      await prisma.asset.update({
        where: { id: asset.id },
        data: {
          embedding: normalize(image_embeds.data as Float32Array),
          embeddedAt: new Date(),
        },
      });
      done++;
    } catch (err) {
      failed++;
      console.error(`  ${asset.filename}: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (done % 25 === 0 || done + failed === assets.length) {
      const elapsed = (Date.now() - started) / 1000;
      const rate = done / elapsed;
      const remaining = assets.length - done - failed;
      const eta = rate > 0 ? Math.round(remaining / rate) : 0;
      console.log(
        `  ${done + failed}/${assets.length} · ${rate.toFixed(1)}/s` +
          (remaining > 0 ? ` · ~${Math.floor(eta / 60)}m ${eta % 60}s left` : '')
      );
    }
  }

  const total = (Date.now() - started) / 1000;
  console.log(`\nEmbedded ${done}, failed ${failed}, in ${Math.round(total)}s`);
  if (done > 0) console.log('Next: npm run cluster:visual');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
