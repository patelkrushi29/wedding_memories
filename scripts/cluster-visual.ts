/**
 * Group photos into candidate functions by what they look like, for libraries
 * with no usable EXIF capture times.
 *
 * Why not plain k-means or DBSCAN over all vectors: we do have one ordering
 * signal even without timestamps — camera filenames increment monotonically, so
 * `AD923555` was definitely shot before `AD926130`. Blind clustering throws that
 * away and happily produces non-contiguous groups ("photo 5 and photo 900 are
 * one event"), which is wrong for a wedding.
 *
 * So, in two passes:
 *
 *   1. Segment each camera's sequence at visual change points. Walking in
 *      filename order, compare each photo to the running mean of the current
 *      segment; a sustained drop in similarity means the outfits, venue or
 *      lighting changed, i.e. a new function.
 *   2. Merge segments across cameras by centroid similarity, because camera A's
 *      ceremony coverage looks like camera B's ceremony coverage. This is what
 *      stitches four photographers into one set of events.
 *
 * Candidates are created hidden, exactly like the timestamp clusterer, so the
 * same /admin naming and publishing flow applies.
 *
 * Usage:
 *   npm run cluster:visual                       # analyse and write candidates
 *   npm run cluster:visual -- --dry              # print the proposal only
 *   npm run cluster:visual -- --threshold=0.72   # stricter/looser boundaries
 */
import 'dotenv/config';
import { createHash } from 'crypto';
import { prisma } from './db';
import { cosine } from './clip';

const arg = (name: string) => {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split('=')[1] : undefined;
};

const DRY = process.argv.includes('--dry');
/**
 * Similarity below which we call it a new scene. Default comes from
 * `calibrate-visual`: adjacent frames sit around 0.86 and unrelated pairs
 * around 0.67, so the boundary belongs between them.
 */
const THRESHOLD = parseFloat(arg('threshold') ?? '0.78');
/** Consecutive dissimilar frames needed to confirm a boundary (kills single-frame noise). */
const CONFIRM = parseInt(arg('confirm') ?? '2', 10);
/** Segments smaller than this are folded into their neighbour. */
const MIN_SEGMENT = parseInt(arg('min') ?? '8', 10);
/** Centroid similarity above which two segments are the same function. */
const MERGE_AT = parseFloat(arg('merge') ?? '0.90');
/**
 * Force an exact number of functions, ignoring the similarity threshold. Use when
 * you know the answer — "this was three events" is information the pixels don't
 * have, and a threshold is a poor way to express it.
 */
const GROUPS = arg('groups') ? parseInt(arg('groups')!, 10) : undefined;
/**
 * Compare each frame against the mean of this many recent frames, not the whole
 * segment. A long scene drifts — a ceremony moves from processional to vows — and
 * a whole-segment mean would keep falling behind and cut it into pieces. A
 * trailing window tracks gradual drift and only breaks on an abrupt change.
 */
const WINDOW = parseInt(arg('window') ?? '5', 10);
/**
 * Which vector to cluster on.
 *   scene  — whole frame. Encodes venue, decor and composition.
 *   outfit — torsos of the people in frame. What everyone is wearing changes
 *            between functions and holds steady within one, so it draws cleaner
 *            boundaries than the frame does.
 *   both   — weighted combination (see --outfit-weight).
 */
const SIGNAL = (arg('signal') ?? 'both') as 'scene' | 'outfit' | 'both';
/** How much of the combined vector is outfit. Outfit leads because it's the stronger cue. */
const OUTFIT_WEIGHT = parseFloat(arg('outfit-weight') ?? '0.65');

interface Photo {
  id: string;
  filename: string;
  embedding: number[];
}

/**
 * Build the vector we cluster on. For 'both', the two unit vectors are scaled and
 * concatenated — cosine similarity over the result is then exactly the weighted sum
 * of the two similarities, which is the behaviour we want and is cheaper than
 * computing them separately.
 */
function signalVector(scene: number[], outfit: number[]): number[] | null {
  const hasScene = scene.length > 0;
  const hasOutfit = outfit.length > 0;

  if (SIGNAL === 'scene') return hasScene ? scene : null;
  if (SIGNAL === 'outfit') return hasOutfit ? outfit : null;

  // 'both' — fall back gracefully when a photo has no legible person
  if (hasScene && hasOutfit) {
    const ws = Math.sqrt(1 - OUTFIT_WEIGHT);
    const wo = Math.sqrt(OUTFIT_WEIGHT);
    return [...scene.map((v) => v * ws), ...outfit.map((v) => v * wo)];
  }
  if (hasScene) return [...scene.map((v) => v * Math.sqrt(1 - OUTFIT_WEIGHT)), ...scene.map(() => 0)];
  return null;
}

interface Segment {
  camera: string;
  photos: Photo[];
  centroid: number[];
}

function cameraOf(filename: string): string {
  return (filename.match(/^[A-Za-z_]+/) ?? ['unknown'])[0];
}

function centroid(photos: Photo[]): number[] {
  const dims = photos[0].embedding.length;
  const sum = new Array<number>(dims).fill(0);
  for (const p of photos) {
    for (let i = 0; i < dims; i++) sum[i] += p.embedding[i];
  }
  let norm = 0;
  for (let i = 0; i < dims; i++) {
    sum[i] /= photos.length;
    norm += sum[i] * sum[i];
  }
  norm = Math.sqrt(norm) || 1;
  return sum.map((v) => v / norm);
}

/** Walk one camera's sequence and cut where the scene changes. */
function segmentCamera(camera: string, photos: Photo[]): Segment[] {
  const segments: Segment[] = [];
  let current: Photo[] = [];
  let pending: Photo[] = []; // candidate frames for a new scene, not yet confirmed

  const flush = () => {
    if (current.length) segments.push({ camera, photos: current, centroid: centroid(current) });
    current = [];
  };

  for (const photo of photos) {
    if (current.length === 0) {
      current.push(photo);
      continue;
    }
    const recent = current.slice(-WINDOW);
    const similarity = cosine(photo.embedding, centroid(recent));

    if (similarity >= THRESHOLD) {
      // Back in the same scene — anything pending was just an odd frame
      current.push(...pending, photo);
      pending = [];
      continue;
    }

    pending.push(photo);
    if (pending.length >= CONFIRM) {
      // Sustained change: close the segment and start again from the pending run
      flush();
      current = pending;
      pending = [];
    }
  }
  current.push(...pending);
  flush();

  // Fold runt segments into whichever neighbour they resemble more
  const merged: Segment[] = [];
  for (const segment of segments) {
    const previous = merged[merged.length - 1];
    if (segment.photos.length < MIN_SEGMENT && previous) {
      previous.photos.push(...segment.photos);
      previous.centroid = centroid(previous.photos);
    } else {
      merged.push(segment);
    }
  }
  return merged;
}

/**
 * Agglomerative merge with **average** linkage: repeatedly join the two closest
 * groups until nothing is close enough.
 *
 * Single linkage (union-find over any qualifying pair) chains — if A resembles B
 * and B resembles C, A and C land together even when they look nothing alike, and
 * one weak bridge collapses the whole wedding into a single group. Average
 * linkage requires a group to resemble another *as a whole*, which is what stops
 * that.
 */
function mergeAcrossCameras(segments: Segment[]): Segment[][] {
  let groups: Segment[][] = segments.map((s) => [s]);

  const linkage = (a: Segment[], b: Segment[]): number => {
    let sum = 0;
    for (const x of a) for (const y of b) sum += cosine(x.centroid, y.centroid);
    return sum / (a.length * b.length);
  };

  for (;;) {
    let best = { score: -1, i: -1, j: -1 };
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const score = linkage(groups[i], groups[j]);
        if (score > best.score) best = { score, i, j };
      }
    }
    if (best.i < 0) break;
    // With an explicit target, keep merging the closest pair until we hit it
    if (GROUPS ? groups.length <= GROUPS : best.score < MERGE_AT) break;
    groups[best.i] = [...groups[best.i], ...groups[best.j]];
    groups = groups.filter((_, idx) => idx !== best.j);
  }
  return groups;
}

async function main() {
  const rows = await prisma.asset.findMany({
    where: { type: 'PHOTO', isAvailable: true, isHidden: false, embeddedAt: { not: null } },
    select: { id: true, filename: true, embedding: true, outfitEmbedding: true },
    orderBy: { filename: 'asc' },
  });

  const photos: Photo[] = [];
  let skipped = 0;
  for (const row of rows) {
    const vector = signalVector(row.embedding, row.outfitEmbedding);
    if (!vector) {
      skipped++;
      continue;
    }
    photos.push({ id: row.id, filename: row.filename, embedding: vector });
  }

  if (photos.length === 0) {
    console.error(
      SIGNAL === 'scene'
        ? 'No embeddings found. Run `npm run embed` first.'
        : 'No outfit signatures found. Run `npm run embed:outfits` first.'
    );
    process.exit(1);
  }

  const withOutfit = rows.filter((r) => r.outfitEmbedding.length > 0).length;
  console.log(
    `Segmenting ${photos.length} photos · signal=${SIGNAL}` +
      (SIGNAL === 'both' ? ` (outfit weight ${OUTFIT_WEIGHT})` : '') +
      ` · threshold ${THRESHOLD} · ${GROUPS ? `forced ${GROUPS} groups` : `merge ${MERGE_AT}`}`
  );
  console.log(`  ${withOutfit}/${rows.length} photos have an outfit signature` + (skipped ? ` · ${skipped} skipped` : '') + '\n');

  const byCamera = new Map<string, Photo[]>();
  for (const photo of photos) {
    const camera = cameraOf(photo.filename);
    if (!byCamera.has(camera)) byCamera.set(camera, []);
    byCamera.get(camera)!.push(photo);
  }

  const allSegments: Segment[] = [];
  for (const [camera, list] of byCamera) {
    const segments = segmentCamera(camera, list);
    console.log(`  ${camera}: ${list.length} photos → ${segments.length} scene(s)`);
    allSegments.push(...segments);
  }

  const groups = mergeAcrossCameras(allSegments)
    .map((segments) => {
      const photos = segments.flatMap((s) => s.photos);
      return {
        photos,
        cameras: [...new Set(segments.map((s) => s.camera))],
        centroid: centroid(photos),
        span: [photos[0].filename, photos[photos.length - 1].filename] as const,
      };
    })
    .sort((a, b) => b.photos.length - a.photos.length);

  console.log(`\n${allSegments.length} scenes merged into ${groups.length} candidate function(s):\n`);
  groups.forEach((group, i) => {
    console.log(
      `  ${i + 1}. ${String(group.photos.length).padStart(4)} photos · cameras ${group.cameras.join('+')} · ${group.span[0]} … ${group.span[1]}`
    );
  });

  if (DRY) {
    console.log('\n--dry: nothing written. Adjust --threshold / --merge and re-run.');
    await prisma.$disconnect();
    return;
  }

  // Discard the previous unpublished proposal — but never anything the host has
  // published, which represents real curation work.
  const previous = await prisma.tag.findMany({
    where: { kind: 'FUNCTION', source: 'clip-cluster', isVisible: false },
    select: { id: true },
  });
  if (previous.length) {
    await prisma.tag.deleteMany({ where: { id: { in: previous.map((t) => t.id) } } });
    console.log(`\nReplaced ${previous.length} previous unpublished candidate(s).`);
  }

  const published = await prisma.tag.findMany({
    where: { kind: 'FUNCTION', source: 'clip-cluster', isVisible: true },
    select: { name: true, slug: true, _count: { select: { assets: true } } },
  });
  if (published.length) {
    console.warn(
      `\n  ⚠ ${published.length} visual candidate(s) are already published and were kept:\n` +
        published.map((p) => `      ${p.name} (${p._count.assets} photos)`).join('\n') +
        '\n    Photos in them will now also belong to the new candidates below, so the same\n' +
        '    photograph can appear under two functions. Delete them in /admin, or delete the\n' +
        '    new candidates, so each photo sits in exactly one.\n'
    );
  }

  let created = 0;
  for (const [i, group] of groups.entries()) {
    // Slug from the member set: identical grouping re-runs to the same slug (so a
    // re-run is idempotent), and a different grouping can never collide with an
    // existing tag the way a positional "scene-3-<first file>" could.
    const fingerprint = createHash('sha1')
      .update(
        group.photos
          .map((p) => p.id)
          .sort()
          .join(',')
      )
      .digest('hex')
      .slice(0, 8);
    const slug = `scene-${fingerprint}`;

    const tag = await prisma.tag.upsert({
      where: { slug },
      update: { sortOrder: i, coverAssetId: group.photos[0].id },
      create: {
        kind: 'FUNCTION',
        name: `Scene ${i + 1}`,
        slug,
        isVisible: false,
        source: 'clip-cluster',
        sortOrder: i,
        coverAssetId: group.photos[0].id,
      },
    });
    await prisma.assetTag.createMany({
      data: group.photos.map((p) => ({ assetId: p.id, tagId: tag.id })),
      skipDuplicates: true,
    });
    created++;
  }

  console.log(`\nWrote ${created} candidate function(s). Name them in /admin.`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
