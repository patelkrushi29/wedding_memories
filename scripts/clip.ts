/**
 * Shared CLIP setup.
 *
 * Weights live in `models/` and are loaded from disk, not fetched at run time —
 * pulling them from the Hub reset mid-download on this connection, and a batch
 * job over 10,000 photos should not depend on a network round trip to start.
 * `models/` is gitignored; see README for how to fetch it.
 */
import * as fs from 'fs';
import * as path from 'path';

export const MODEL_ID = 'clip-vit-base-patch32';
export const EMBED_DIMS = 512;

/** Point Transformers.js at the local weights and forbid remote fetches. */
export function configureLocalModels(env: {
  localModelPath: string;
  allowRemoteModels: boolean;
  allowLocalModels: boolean;
}) {
  const dir = path.resolve('models');
  if (!fs.existsSync(path.join(dir, MODEL_ID, 'config.json'))) {
    console.error(
      `Model weights missing. Expected models/${MODEL_ID}/config.json\n` +
        'Fetch them with the curl commands in README ("Visual clustering").'
    );
    process.exit(1);
  }
  env.localModelPath = dir;
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
}

export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/** Unit-length copy, so cosine similarity reduces to a dot product later. */
export function normalize(v: ArrayLike<number>): number[] {
  let norm = 0;
  for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
  norm = Math.sqrt(norm) || 1;
  const out = new Array<number>(v.length);
  for (let i = 0; i < v.length; i++) out[i] = v[i] / norm;
  return out;
}
