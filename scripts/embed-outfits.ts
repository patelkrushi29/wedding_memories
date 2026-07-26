/**
 * Build an "outfit signature" per photo: detect the people, crop their torsos,
 * and embed those crops rather than the whole frame.
 *
 * Why this beats whole-frame embeddings for finding function boundaries:
 * a full-frame vector is dominated by composition, venue and lighting, so a
 * close-up of hands and a wide shot of the same room score as *different*, while
 * two close-ups from different days score as *similar*. What actually changes
 * between functions — and stays constant within one — is what everyone is wearing.
 *
 * Pipeline signal only. There is no "red lehenga" filter in the UI, by design.
 *
 * Usage:
 *   npm run embed:outfits
 *   npm run embed:outfits -- --limit=30 --force
 */
import 'dotenv/config';
import {
  pipeline,
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

const arg = (n: string) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const LIMIT = arg('limit') ? parseInt(arg('limit')!, 10) : undefined;
const FORCE = process.argv.includes('--force');
/** Ignore people smaller than this fraction of frame height — their clothes are mush. */
const MIN_HEIGHT = parseFloat(arg('min-height') ?? '0.22');
/** Torsos to average. The main subjects carry the signal; the crowd adds noise. */
const MAX_PEOPLE = parseInt(arg('people') ?? '4', 10);
const DETECT_THRESHOLD = parseFloat(arg('confidence') ?? '0.6');

interface Detection {
  label: string;
  score: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
}

async function main() {
  const assets = await prisma.asset.findMany({
    where: {
      type: 'PHOTO',
      isAvailable: true,
      ...(FORCE ? {} : { outfitAt: null }),
    },
    select: { id: true, filename: true, viewerPath: true, thumbnailPath: true, originalPath: true },
    orderBy: { filename: 'asc' },
    ...(LIMIT ? { take: LIMIT } : {}),
  });

  if (assets.length === 0) {
    console.log('Every photo already has an outfit signature. Use --force to recompute.');
    await prisma.$disconnect();
    return;
  }

  console.log(`Reading outfits from ${assets.length} photo(s)…`);
  const detector = await pipeline('object-detection', 'yolos-tiny', { dtype: 'q8' });
  const processor = await AutoProcessor.from_pretrained(MODEL_ID);
  const clip = await CLIPVisionModelWithProjection.from_pretrained(MODEL_ID, { dtype: 'q8' });

  let done = 0;
  let empty = 0;
  let failed = 0;
  const started = Date.now();

  for (const asset of assets) {
    try {
      // Viewer tier gives bigger torsos than the grid thumbnail
      const key = asset.viewerPath ?? asset.thumbnailPath ?? asset.originalPath;
      const buffer = await downloadFromR2(key);
      const base = sharp(buffer).rotate();
      const { data, info } = await base
        .clone()
        .removeAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });

      const frame = new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);
      const detections = (await detector(frame, {
        threshold: DETECT_THRESHOLD,
      })) as unknown as Detection[];

      const people = detections
        .filter((d) => d.label === 'person')
        .map((d) => ({ ...d, height: d.box.ymax - d.box.ymin }))
        .filter((d) => d.height / info.height >= MIN_HEIGHT)
        .sort((a, b) => b.height - a.height)
        .slice(0, MAX_PEOPLE);

      const vectors: number[][] = [];
      for (const person of people) {
        // Shoulders to waist, central 80% of the box so neighbours don't bleed in
        const boxW = person.box.xmax - person.box.xmin;
        const left = Math.round(person.box.xmin + boxW * 0.1);
        const top = Math.round(person.box.ymin + person.height * 0.15);
        const width = Math.round(boxW * 0.8);
        const height = Math.round(person.height * 0.45);
        if (width < 32 || height < 32) continue;

        const crop = await base
          .clone()
          .extract({
            left: Math.max(0, Math.min(left, info.width - 1)),
            top: Math.max(0, Math.min(top, info.height - 1)),
            width: Math.min(width, info.width - left),
            height: Math.min(height, info.height - top),
          })
          .resize(224, 224, { fit: 'cover' })
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        const image = new RawImage(new Uint8ClampedArray(crop.data), 224, 224, 3);
        const inputs = await processor(image);
        const { image_embeds } = await clip(inputs);
        vectors.push(normalize(image_embeds.data as Float32Array));
      }

      if (vectors.length === 0) {
        // No legible person — record the attempt so we don't retry every run
        await prisma.asset.update({
          where: { id: asset.id },
          data: { outfitEmbedding: [], outfitPeople: 0, outfitAt: new Date() },
        });
        empty++;
      } else {
        const dims = vectors[0].length;
        const mean = new Array<number>(dims).fill(0);
        for (const v of vectors) for (let i = 0; i < dims; i++) mean[i] += v[i] / vectors.length;
        await prisma.asset.update({
          where: { id: asset.id },
          data: {
            outfitEmbedding: normalize(mean),
            outfitPeople: vectors.length,
            outfitAt: new Date(),
          },
        });
        done++;
      }
    } catch (err) {
      failed++;
      console.error(`  ${asset.filename}: ${err instanceof Error ? err.message : String(err)}`);
    }

    const seen = done + empty + failed;
    if (seen % 25 === 0 || seen === assets.length) {
      const elapsed = (Date.now() - started) / 1000;
      const rate = seen / elapsed;
      const left = assets.length - seen;
      const eta = rate > 0 ? Math.round(left / rate) : 0;
      console.log(
        `  ${seen}/${assets.length} · ${rate.toFixed(1)}/s · ${done} with outfits, ${empty} without` +
          (left > 0 ? ` · ~${Math.floor(eta / 60)}m ${eta % 60}s left` : '')
      );
    }
  }

  console.log(`\nOutfit signatures: ${done} written, ${empty} had no legible person, ${failed} failed`);
  if (done > 0) console.log('Next: npm run cluster:visual -- --dry --signal=outfit');
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
