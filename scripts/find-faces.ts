/**
 * Find everyone in the photographs (Phase C1–C3, plus G2 "Your best").
 *
 *   1. Detect every face in every guest-visible photo (scripts/faces/detector.ts:
 *      free, on CPU). Results are cached per photo in .cache/faces/, so re-runs only
 *      look at new photos. The GitHub Action persists that cache between runs.
 *   2. Group faces into people: average-linkage clustering on identity embeddings,
 *      with one hard rule — two faces in the same photo are never the same person.
 *      The threshold was measured (DECISIONS D24): it prefers splitting one person
 *      in two over merging two people, because a split is fixable ("That's me" on
 *      both, or merge in /admin) and a merge shows guests a stranger's photos.
 *   3. Write PERSON tags (AssetTag = the photos they're in). People are matched to
 *      the previous run by photo overlap, so slugs — which is what guests' devices
 *      store for "That's me" — and host-given names survive a re-run. Hidden people
 *      stay hidden.
 *   4. For each person, pick their best photos (a BEST tag under the person): big
 *      face, eyes open, not a folded near-duplicate, highlight bonus.
 *   5. Crop a face-wall thumbnail per person to R2 at faces/<tagId>.webp.
 *
 * Usage:
 *   npm run find:faces                # detect new photos, re-cluster, write
 *   npm run find:faces -- --dry       # report only
 *   npm run find:faces -- --redetect  # ignore the cache
 *   npm run find:faces -- --threshold=0.5
 *
 * Dev: set FACE_CROP_DIR to write crops to a folder instead of R2.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { prisma } from './db';
import { attachMediaUrls } from '../src/lib/storage/assetUrls';
import { faceCropKey } from '../src/lib/people/faceUrl';
import { isR2Configured, uploadToR2 } from './r2';
import { cropFace, detectFaces, type Detection } from './faces/detector';

const arg = (name: string) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const DRY = process.argv.includes('--dry');
const REDETECT = process.argv.includes('--redetect');
/** Average cosine similarity at or above which faces/groups are one person. */
const THRESHOLD = parseFloat(arg('threshold') ?? '0.5');
/** Faces smaller than this (px on the 1600px render) are crowd noise. */
const MIN_FACE_PX = parseInt(arg('min-face') ?? '44', 10);
/** A person needs at least this many photos to be listed. */
const MIN_PHOTOS = parseInt(arg('min-photos') ?? '2', 10);
const CACHE_DIR = path.join(process.cwd(), '.cache/faces');
const CACHE_VERSION = 1;

interface CachedDetection extends Detection {
  v: number;
  assetId: string;
}

interface Face {
  key: string; // assetId#index
  assetId: string;
  index: number;
  vec: Float32Array; // L2-normalised embedding
  area: number; // face area as a fraction of the frame
  px: number; // face width in px
  score: number;
  blink: boolean;
  facing: string;
  detection: CachedDetection;
}

function normalise(v: number[]): Float32Array {
  const out = new Float32Array(v.length);
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  v.forEach((x, i) => (out[i] = x / n));
  return out;
}

function dot(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

async function fetchBytes(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function cachePath(assetId: string) {
  return path.join(CACHE_DIR, `${assetId}.json`);
}

function readCache(assetId: string): CachedDetection | null {
  try {
    const c = JSON.parse(fs.readFileSync(cachePath(assetId), 'utf8')) as CachedDetection;
    return c.v === CACHE_VERSION ? c : null;
  } catch {
    return null;
  }
}

// ── 1. Detect ────────────────────────────────────────────────────────────
async function detectAll(assets: { id: string; filename: string; previewUrl: string }[]) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const todo = assets.filter((a) => REDETECT || !readCache(a.id));
  console.log(`Photos: ${assets.length} · cached ${assets.length - todo.length} · to analyse ${todo.length}`);
  const started = Date.now();
  let failed = 0;
  for (const [i, a] of todo.entries()) {
    try {
      const det = await detectFaces(await fetchBytes(a.previewUrl));
      const cached: CachedDetection = { v: CACHE_VERSION, assetId: a.id, ...det };
      fs.writeFileSync(cachePath(a.id), JSON.stringify(cached));
    } catch (err) {
      failed++;
      console.warn(`  ! ${a.filename}: ${(err as Error).message}`);
    }
    if ((i + 1) % 25 === 0 || i === todo.length - 1) {
      const rate = (Date.now() - started) / (i + 1);
      const eta = Math.round(((todo.length - i - 1) * rate) / 60000);
      console.log(`  analysed ${i + 1}/${todo.length}${eta ? ` · ~${eta} min left` : ''}`);
    }
  }
  if (failed) console.log(`  ${failed} photos could not be read`);
}

// ── 2. Cluster ───────────────────────────────────────────────────────────
interface Cluster {
  faces: Face[];
  sum: Float32Array; // sum of member vectors → average linkage by dot product
  assets: Set<string>;
}

function newCluster(f: Face): Cluster {
  return { faces: [f], sum: Float32Array.from(f.vec), assets: new Set([f.assetId]) };
}

function addTo(c: Cluster, f: Face) {
  c.faces.push(f);
  for (let i = 0; i < c.sum.length; i++) c.sum[i] += f.vec[i];
  c.assets.add(f.assetId);
}

function cluster(faces: Face[]): Cluster[] {
  // Seed with the clearest faces first: big, frontal, confident.
  const ordered = [...faces].sort((a, b) => b.px * b.score - a.px * a.score);
  const clusters: Cluster[] = [];
  for (const f of ordered) {
    let best: Cluster | null = null;
    let bestSim = THRESHOLD;
    for (const c of clusters) {
      if (c.assets.has(f.assetId)) continue; // same photo → different people
      const sim = dot(f.vec, c.sum) / c.faces.length; // mean similarity to members
      if (sim >= bestSim) {
        bestSim = sim;
        best = c;
      }
    }
    if (best) addTo(best, f);
    else clusters.push(newCluster(f));
  }

  // Merge pass: join groups whose mean cross-similarity clears the bar.
  let merged = true;
  while (merged) {
    merged = false;
    let bi = -1;
    let bj = -1;
    let bestSim = THRESHOLD;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const a = clusters[i];
        const b = clusters[j];
        if ([...b.assets].some((x) => a.assets.has(x))) continue;
        const sim = dot(a.sum, b.sum) / (a.faces.length * b.faces.length);
        if (sim >= bestSim) {
          bestSim = sim;
          bi = i;
          bj = j;
        }
      }
    }
    if (bi >= 0) {
      for (const f of clusters[bj].faces) addTo(clusters[bi], f);
      clusters.splice(bj, 1);
      merged = true;
    }
  }
  return clusters.sort((a, b) => b.assets.size - a.assets.size);
}

// ── Quality of a face for covers and "best of" ──────────────────────────
function faceQuality(f: Face): number {
  const size = Math.min(1, Math.sqrt(f.area) / 0.35); // a face ~35% of the frame width is "full"
  return size * 0.55 + (f.blink ? 0 : 0.3) + (f.facing === 'center' ? 0.1 : 0) + f.score * 0.05;
}

async function main() {
  const rows = await prisma.asset.findMany({
    where: { isHidden: false, isAvailable: true, type: 'PHOTO' },
    select: { id: true, filename: true, thumbnailPath: true, viewerPath: true, posterPath: true, originalPath: true, isHighlight: true },
    orderBy: { id: 'asc' },
  });
  const assets = rows.map((r) => ({ ...attachMediaUrls(r), isHighlight: r.isHighlight }));
  await detectAll(assets);

  // Folded burst members never become someone's "best" — their lead stands in.
  const folded = new Set(
    (
      await prisma.assetTag.findMany({
        where: { tag: { kind: 'MOMENT', source: 'quality' } },
        select: { assetId: true },
      })
    ).map((r) => r.assetId)
  );
  const highlight = new Set(assets.filter((a) => a.isHighlight).map((a) => a.id));

  const faces: Face[] = [];
  for (const a of assets) {
    const det = readCache(a.id);
    if (!det) continue;
    det.faces.forEach((f, index) => {
      if (f.box[2] < MIN_FACE_PX) return;
      faces.push({
        key: `${a.id}#${index}`,
        assetId: a.id,
        index,
        vec: normalise(f.embedding),
        area: (f.box[2] * f.box[3]) / (det.width * det.height),
        px: f.box[2],
        score: f.score,
        blink: f.blink,
        facing: f.facing,
        detection: det,
      });
    });
  }
  console.log(`Faces large enough to identify: ${faces.length}`);
  const people = cluster(faces).filter((c) => c.assets.size >= MIN_PHOTOS);
  console.log(`People in ${MIN_PHOTOS}+ photos: ${people.length} (threshold ${THRESHOLD})`);
  people.slice(0, 12).forEach((p, i) => console.log(`  #${i + 1}: ${p.assets.size} photos`));
  if (DRY) {
    console.log('\n--dry: nothing written.');
    return;
  }

  // ── 3. Match to last run and write PERSON tags ─────────────────────────
  const previous = await prisma.tag.findMany({
    where: { kind: 'PERSON', source: 'face' },
    select: { id: true, slug: true, name: true, isVisible: true, assets: { select: { assetId: true } } },
  });
  const prevSets = previous.map((p) => ({ ...p, set: new Set(p.assets.map((a) => a.assetId)) }));
  // A new group belongs to a previous person when most of its photos were theirs.
  // Many groups may map to one person: that is how a host's merge in /admin
  // survives re-clustering, which may split them again.
  const owner = people.map((c) => {
    let best: (typeof prevSets)[number] | null = null;
    let bestShare = 0.6;
    for (const p of prevSets) {
      let inter = 0;
      for (const a of c.assets) if (p.set.has(a)) inter++;
      const share = inter / c.assets.size;
      if (share > bestShare) {
        bestShare = share;
        best = p;
      }
    }
    return best;
  });
  // Fold groups that share an owner into one.
  const byOwner = new Map<string, number>();
  for (let i = people.length - 1; i >= 0; i--) {
    const o = owner[i];
    if (!o) continue;
    const first = byOwner.get(o.id);
    if (first === undefined) {
      byOwner.set(o.id, i);
      continue;
    }
    for (const f of people[i].faces) addTo(people[first], f);
    people.splice(i, 1);
    owner.splice(i, 1);
    for (const [k, v] of byOwner) if (v > i) byOwner.set(k, v - 1);
  }
  const claimed = new Set(owner.filter(Boolean).map((o) => o!.id));
  const matches = owner;

  const writeCrop = async (tagId: string, bytes: Buffer) => {
    if (process.env.FACE_CROP_DIR) {
      fs.mkdirSync(process.env.FACE_CROP_DIR, { recursive: true });
      fs.writeFileSync(path.join(process.env.FACE_CROP_DIR, `${tagId}.webp`), bytes);
    } else if (isR2Configured()) {
      await uploadToR2(faceCropKey(tagId), bytes, 'image/webp');
    } else {
      throw new Error('No R2 credentials and no FACE_CROP_DIR — cannot store face crops');
    }
  };
  const previewOf = new Map(assets.map((a) => [a.id, a.previewUrl]));

  let created = 0;
  let kept = 0;
  for (const [i, c] of people.entries()) {
    const prev = matches[i];
    const cover = [...c.faces].sort((a, b) => faceQuality(b) - faceQuality(a))[0];
    const assetIds = [...c.assets];
    const tag = prev
      ? await prisma.tag.update({
          where: { id: prev.id },
          data: { coverAssetId: cover.assetId, sortOrder: -assetIds.length },
        })
      : await prisma.tag.create({
          data: {
            kind: 'PERSON',
            name: '',
            slug: `p-${randomBytes(5).toString('hex')}`,
            source: 'face',
            isVisible: true,
            coverAssetId: cover.assetId,
            sortOrder: -assetIds.length,
          },
        });
    prev ? kept++ : created++;

    await prisma.$transaction([
      prisma.assetTag.deleteMany({ where: { tagId: tag.id } }),
      prisma.assetTag.createMany({ data: assetIds.map((assetId) => ({ assetId, tagId: tag.id })), skipDuplicates: true }),
    ]);

    // ── 4. Their best photos ─────────────────────────────────────────────
    const perPhoto = new Map<string, number>();
    for (const f of c.faces) {
      if (folded.has(f.assetId)) continue;
      const crowd = Math.min(0.2, (f.detection.faces.length - 1) * 0.02);
      const q = faceQuality(f) + (highlight.has(f.assetId) ? 0.15 : 0) - crowd;
      perPhoto.set(f.assetId, Math.max(perPhoto.get(f.assetId) ?? 0, q));
    }
    const n = Math.max(Math.min(perPhoto.size, 3), Math.min(24, Math.round(perPhoto.size * 0.2)));
    const best = [...perPhoto.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([id]) => id);
    await prisma.tag.deleteMany({ where: { kind: 'BEST', parentId: tag.id } });
    await prisma.tag.create({
      data: {
        kind: 'BEST',
        name: 'Best photos',
        slug: `best-${tag.slug}`,
        parentId: tag.id,
        source: 'face',
        isVisible: true,
        assets: { create: best.map((assetId) => ({ assetId })) },
      },
    });

    // ── 5. Face-wall crop ────────────────────────────────────────────────
    try {
      const url = previewOf.get(cover.assetId)!;
      const det = cover.detection;
      await writeCrop(tag.id, await cropFace(await fetchBytes(url), det, det.faces[cover.index].box));
    } catch (err) {
      console.warn(`  ! crop for ${tag.slug}: ${(err as Error).message}`);
    }
  }

  // People who vanished from the clustering. Named ones are kept (hidden) so the
  // host's work isn't lost; unnamed ones are removed.
  const orphans = prevSets.filter((p) => !claimed.has(p.id));
  for (const o of orphans) {
    if (o.name) {
      await prisma.assetTag.deleteMany({ where: { tagId: o.id } });
      await prisma.tag.update({ where: { id: o.id }, data: { isVisible: false } });
      console.warn(`  ${o.name} (${o.slug}) no longer matches a face group — hidden, not deleted`);
    } else {
      await prisma.tag.deleteMany({ where: { OR: [{ id: o.id }, { kind: 'BEST', parentId: o.id }] } });
    }
  }
  console.log(`Wrote ${people.length} people: ${kept} matched to last run, ${created} new, ${orphans.length} gone.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
