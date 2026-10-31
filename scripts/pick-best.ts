/**
 * Pick the best photographs, so guests see the keepers first (Phase G1, first cut).
 *
 * For every function:
 *
 *   1. Score each photo from its 600px thumbnail:
 *        - sharpness: Tenengrad edge energy (blurry frames have little of it)
 *        - exposure: penalise frames that are mostly crushed blacks or blown whites
 *      Scores are normalised within the function, because "sharp" at a candlelit
 *      Sangeet is not "sharp" at a noon Haldi.
 *
 *   2. Fold bursts. Walking in shooting order, consecutive frames that look nearly
 *      identical (difference hash, or CLIP embedding when one exists) are one
 *      moment. The highest-scoring frame leads; the others are folded behind it.
 *      Stored as a MOMENT tag (source "quality") whose cover is the lead and whose
 *      AssetTag rows are the *other* members — so "hide folded frames" is a plain
 *      `tags: { none: … }` filter and the lead needs no extra row.
 *
 *   3. Mark highlights (Asset.isHighlight). The function's burst leads are cut into
 *      K equal stretches of time and the best of each stretch is picked, so the
 *      highlights tell the event in order rather than clustering on the one
 *      well-lit corner of the room.
 *
 * Faces and eyes-open aren't scored yet — that arrives with the face pipeline
 * (Phase C), and slots into `score()` below.
 *
 * Safe to re-run: it replaces its own MOMENT tags and highlight flags each time,
 * and never touches functions, days or anything the host set.
 *
 * Usage:
 *   npm run pick:best                 # all functions
 *   npm run pick:best -- --dry        # report only
 *   npm run pick:best -- --function=sangeet
 */
import 'dotenv/config';
import { createHash } from 'crypto';
import sharp from 'sharp';
import { prisma } from './db';
import { cosine } from './clip';
import { thumbnailUrlFor } from '../src/lib/storage/assetUrls';

const arg = (name: string) => {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : undefined;
};
const DRY = process.argv.includes('--dry');
const ONLY = arg('function');

/** dHash Hamming distance at or under which two adjacent frames are one moment. */
const DHASH_SAME = parseInt(arg('dhash') ?? '10', 10);
/** CLIP cosine at or over which two adjacent frames are one moment. */
const CLIP_SAME = parseFloat(arg('clip') ?? '0.95');
/** Frames further apart than this (seconds) are never one burst, when times are real. */
const BURST_GAP_S = parseInt(arg('gap') ?? '45', 10);

interface Scored {
  id: string;
  takenAt: Date | null;
  filename: string;
  embedding: number[];
  sharpness: number;
  exposure: number;
  dhash: bigint;
  score: number;
}

async function thumbnailBytes(asset: { id: string; thumbnailPath: string | null; posterPath: string | null }) {
  let url = thumbnailUrlFor(asset);
  if (url.startsWith('/')) {
    // Relative fallback route — only reachable through a running app.
    const base = process.env.APP_BASE_URL;
    if (!base) throw new Error('thumbnail has no public URL; set R2_PUBLIC_BASE_URL');
    url = base.replace(/\/$/, '') + url;
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Tenengrad: mean squared Sobel gradient on a lightly denoised 200px copy.
 * Laplacian variance was tried first and lost to it — at thumbnail size the
 * Laplacian mostly measures JPEG/WebP noise, so a soft, noisy frame could
 * outscore the sharp one. A small blur before the gradient removes that noise
 * while real edges survive.
 */
async function sharpnessOf(img: Buffer): Promise<number> {
  const base = sharp(img).greyscale().resize(200, 200, { fit: 'inside' }).blur(0.8);
  // Offset keeps negative responses from clipping to 0, which would halve the signal.
  const [gx, gy] = await Promise.all([
    base.clone().convolve({ width: 3, height: 3, kernel: [-1, 0, 1, -2, 0, 2, -1, 0, 1], offset: 128 }).raw().toBuffer(),
    base.clone().convolve({ width: 3, height: 3, kernel: [-1, -2, -1, 0, 0, 0, 1, 2, 1], offset: 128 }).raw().toBuffer(),
  ]);
  let energy = 0;
  for (let i = 0; i < gx.length; i++) {
    const a = gx[i] - 128;
    const b = gy[i] - 128;
    energy += a * a + b * b;
  }
  return energy / gx.length;
}

/** 0..1, where 1 means few crushed or blown pixels. */
async function exposureOf(img: Buffer): Promise<number> {
  const { data } = await sharp(img).greyscale().resize(64, 64, { fit: 'inside' }).raw().toBuffer({ resolveWithObject: true });
  let bad = 0;
  for (const v of data) if (v < 12 || v > 248) bad++;
  return 1 - Math.min(1, (bad / data.length) * 2.5);
}

/** 64-bit difference hash: robust to small shifts and recompression, cheap to compare. */
async function dhashOf(img: Buffer): Promise<bigint> {
  const { data } = await sharp(img).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let h = BigInt(0);
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      h = (h << BigInt(1)) | (data[y * 9 + x] < data[y * 9 + x + 1] ? BigInt(1) : BigInt(0));
    }
  }
  return h;
}

function hamming(a: bigint, b: bigint): number {
  let x = a ^ b;
  let n = 0;
  while (x) {
    n += Number(x & BigInt(1));
    x >>= BigInt(1);
  }
  return n;
}

function zscores(values: number[]): number[] {
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) || 1;
  return values.map((v) => (v - mean) / sd);
}

/** Higher is better. Faces/eyes join here once Phase C exists. */
function score(sharpZ: number, exposure: number): number {
  return 0.75 * sharpZ + 0.25 * (exposure * 4 - 2);
}

function sameMoment(a: Scored, b: Scored): boolean {
  const realTimes = a.takenAt && b.takenAt && a.takenAt.getTime() !== b.takenAt.getTime();
  if (realTimes && Math.abs(a.takenAt!.getTime() - b.takenAt!.getTime()) > BURST_GAP_S * 1000) return false;
  if (a.embedding.length && b.embedding.length && cosine(a.embedding, b.embedding) >= CLIP_SAME) return true;
  return hamming(a.dhash, b.dhash) <= DHASH_SAME;
}

/** How many highlights a function of `n` distinct moments gets. */
function highlightCount(n: number): number {
  return Math.max(Math.min(n, 4), Math.min(24, Math.round(n * 0.15)));
}

async function processFunction(fn: { id: string; name: string; slug: string }) {
  const assets = await prisma.asset.findMany({
    where: { isHidden: false, isAvailable: true, type: 'PHOTO', tags: { some: { tagId: fn.id } } },
    orderBy: [{ takenAt: { sort: 'asc', nulls: 'last' } }, { filename: 'asc' }, { id: 'asc' }],
    select: { id: true, takenAt: true, filename: true, thumbnailPath: true, posterPath: true, embedding: true },
  });
  if (assets.length === 0) return;

  const raw: Omit<Scored, 'score'>[] = [];
  let failed = 0;
  for (const [i, a] of assets.entries()) {
    try {
      const img = await thumbnailBytes(a);
      const [sharpness, exposure, dhash] = await Promise.all([sharpnessOf(img), exposureOf(img), dhashOf(img)]);
      raw.push({ id: a.id, takenAt: a.takenAt, filename: a.filename, embedding: a.embedding, sharpness, exposure, dhash });
    } catch (err) {
      failed++;
      console.warn(`  ! ${a.filename}: ${(err as Error).message}`);
    }
    if ((i + 1) % 50 === 0) console.log(`  ${fn.name}: ${i + 1}/${assets.length}`);
  }
  if (raw.length === 0) return;

  const sharpZ = zscores(raw.map((r) => Math.log1p(r.sharpness)));
  const scored: Scored[] = raw.map((r, i) => ({ ...r, score: score(sharpZ[i], r.exposure) }));

  // Bursts: runs of consecutive near-identical frames.
  const bursts: Scored[][] = [];
  for (const s of scored) {
    const current = bursts.at(-1);
    if (current && sameMoment(current.at(-1)!, s)) current.push(s);
    else bursts.push([s]);
  }
  const leads = bursts.map((b) => b.reduce((best, s) => (s.score > best.score ? s : best)));

  // Highlights: best lead in each of K equal stretches of the timeline.
  const k = highlightCount(leads.length);
  const highlights = new Set<string>();
  for (let i = 0; i < k; i++) {
    const from = Math.floor((i * leads.length) / k);
    const to = Math.floor(((i + 1) * leads.length) / k);
    const stretch = leads.slice(from, Math.max(to, from + 1));
    highlights.add(stretch.reduce((best, s) => (s.score > best.score ? s : best)).id);
  }

  const multi = bursts.filter((b) => b.length > 1);
  const folded = multi.reduce((n, b) => n + b.length - 1, 0);
  console.log(
    `${fn.name}: ${scored.length} photos · ${multi.length} bursts folding ${folded} · ${highlights.size} highlights` +
      (failed ? ` · ${failed} unreadable` : '')
  );
  if (DRY) return;

  // Replace this script's previous output for the function, then write the new one.
  await prisma.tag.deleteMany({ where: { kind: 'MOMENT', source: 'quality', parentId: fn.id } });
  await prisma.asset.updateMany({
    where: { tags: { some: { tagId: fn.id } }, isHighlight: true },
    data: { isHighlight: false },
  });
  if (highlights.size) {
    await prisma.asset.updateMany({ where: { id: { in: [...highlights] } }, data: { isHighlight: true } });
  }
  for (const [i, burst] of multi.entries()) {
    const lead = burst.reduce((best, s) => (s.score > best.score ? s : best));
    const hash = createHash('sha1').update(burst.map((b) => b.id).join(',')).digest('hex').slice(0, 10);
    await prisma.tag.create({
      data: {
        kind: 'MOMENT',
        name: `${fn.name} · moment ${i + 1}`,
        slug: `burst-${fn.slug}-${hash}`,
        parentId: fn.id,
        coverAssetId: lead.id,
        isVisible: true,
        source: 'quality',
        assets: { create: burst.filter((b) => b.id !== lead.id).map((b) => ({ assetId: b.id })) },
      },
    });
  }
}

async function main() {
  const functions = await prisma.tag.findMany({
    where: { kind: 'FUNCTION', ...(ONLY ? { slug: ONLY } : {}) },
    orderBy: [{ startAt: 'asc' }, { sortOrder: 'asc' }],
    select: { id: true, name: true, slug: true },
  });
  if (functions.length === 0) console.log('No functions found. Run cluster:events or cluster:visual first.');
  for (const fn of functions) {
    try {
      await processFunction(fn);
    } catch (err) {
      console.error(`${fn.name}: failed — ${(err as Error).message}`);
    }
  }
  if (DRY) console.log('\n--dry: nothing written.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
