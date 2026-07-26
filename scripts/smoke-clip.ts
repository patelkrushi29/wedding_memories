/**
 * Does the embedding model actually separate this library? Run before trusting
 * any clustering built on top of it.
 *
 * Takes photos from opposite ends of two cameras' sequences and prints the
 * pairwise similarity matrix. Neighbouring frames should score high (~0.9+);
 * frames from far apart should score noticeably lower. If everything scores 0.95
 * the model is useless for segmentation and we need a different signal.
 */
import 'dotenv/config';
import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
  env,
} from '@huggingface/transformers';
import sharp from 'sharp';
import { downloadFromR2, listR2Objects } from './r2';
import { MODEL_ID, configureLocalModels } from './clip';

configureLocalModels(env);
const MODEL = MODEL_ID;

function cosine(a: Float32Array | number[], b: Float32Array | number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function main() {
  const keys = (await listR2Objects('media/')).map((o) => o.key).sort();

  // Sample across the library: first/middle/last of the two largest cameras
  const ad = keys.filter((k) => k.includes('/AD'));
  const jigs = keys.filter((k) => k.includes('/JIGS'));
  const picks = [
    ad[0],
    ad[Math.floor(ad.length / 2)],
    ad[ad.length - 1],
    jigs[0],
    jigs[Math.floor(jigs.length / 2)],
    jigs[jigs.length - 1],
  ].filter(Boolean);

  console.log(`Loading ${MODEL} (first run downloads ~90 MB)…`);
  const processor = await AutoProcessor.from_pretrained(MODEL);
  // q8 → the *_quantized.onnx weights we hold locally
  const model = await CLIPVisionModelWithProjection.from_pretrained(MODEL, { dtype: 'q8' });
  console.log('Model ready.\n');

  const vectors: { name: string; vec: Float32Array }[] = [];
  for (const key of picks) {
    const buffer = await downloadFromR2(key);
    // RawImage wants raw pixels; sharp gives us a predictable RGB buffer
    const { data, info } = await sharp(buffer)
      .rotate()
      .resize(336, 336, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const image = new RawImage(new Uint8ClampedArray(data), info.width, info.height, 3);

    const inputs = await processor(image);
    const { image_embeds } = await model(inputs);
    vectors.push({ name: key.replace('media/', ''), vec: image_embeds.data as Float32Array });
    console.log(`  embedded ${key.replace('media/', '')}  (${image_embeds.data.length} dims)`);
  }

  console.log('\nPairwise similarity:\n');
  const label = (n: string) => n.slice(0, 12).padEnd(13);
  process.stdout.write('             ' + vectors.map((v) => label(v.name)).join('') + '\n');
  for (const a of vectors) {
    process.stdout.write(label(a.name));
    for (const b of vectors) {
      process.stdout.write(cosine(a.vec, b.vec).toFixed(3).padEnd(13));
    }
    process.stdout.write('\n');
  }

  const offDiagonal: number[] = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      offDiagonal.push(cosine(vectors[i].vec, vectors[j].vec));
    }
  }
  const min = Math.min(...offDiagonal);
  const max = Math.max(...offDiagonal);
  console.log(`\nspread across different photos: ${min.toFixed(3)} … ${max.toFixed(3)}`);
  console.log(
    max - min > 0.15
      ? 'Good — the model discriminates. Clustering on this is viable.'
      : 'Too flat. These photos look alike to the model; segmentation would be guesswork.'
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
