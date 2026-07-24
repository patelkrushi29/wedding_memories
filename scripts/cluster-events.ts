/**
 * Group untagged assets into candidate EVENT clusters by time gaps.
 *
 * Photos taken within GAP_HOURS of each other belong to the same candidate event.
 * Clusters are created as hidden Tag(kind=EVENT, source=time-cluster) — the admin
 * reviews them in /admin, names them, and makes them visible.
 *
 * Usage:
 *   npm run cluster:events            (3h gap default)
 *   npm run cluster:events -- --gap=6 (custom gap in hours)
 */
import 'dotenv/config';
import slugify from 'slugify';
import { prisma } from './db';

const gapArg = process.argv.find((a) => a.startsWith('--gap='));
const GAP_HOURS = gapArg ? parseFloat(gapArg.split('=')[1]) : 3;
const GAP_MS = GAP_HOURS * 60 * 60 * 1000;
const MIN_CLUSTER_SIZE = 3; // ignore stray singletons; they can be tagged manually

async function main() {
  // Only cluster assets that don't already carry an EVENT tag
  const assets = await prisma.asset.findMany({
    where: {
      isAvailable: true,
      isHidden: false,
      tags: { none: { tag: { kind: 'EVENT' } } },
    },
    select: { id: true, takenAt: true, modifiedAt: true },
  });

  // Effective timestamp: EXIF takenAt preferred, upload/modified time as fallback
  const timed = assets
    .map((a) => ({ id: a.id, t: (a.takenAt ?? a.modifiedAt).getTime() }))
    .sort((a, b) => a.t - b.t);

  console.log(`Clustering ${timed.length} untagged assets (gap: ${GAP_HOURS}h)`);
  if (timed.length === 0) {
    await prisma.$disconnect();
    return;
  }

  const clusters: { ids: string[]; start: number; end: number }[] = [];
  let current = { ids: [timed[0].id], start: timed[0].t, end: timed[0].t };

  for (let i = 1; i < timed.length; i++) {
    const { id, t } = timed[i];
    if (t - current.end > GAP_MS) {
      clusters.push(current);
      current = { ids: [id], start: t, end: t };
    } else {
      current.ids.push(id);
      current.end = t;
    }
  }
  clusters.push(current);

  const keep = clusters.filter((c) => c.ids.length >= MIN_CLUSTER_SIZE);
  console.log(`Found ${clusters.length} clusters, ${keep.length} with >= ${MIN_CLUSTER_SIZE} photos`);

  let created = 0;
  for (const cluster of keep) {
    const startAt = new Date(cluster.start);
    const endAt = new Date(cluster.end);
    const dateLabel = startAt.toISOString().slice(0, 10);
    const timeLabel = startAt.toISOString().slice(11, 16).replace(':', '');

    const name = `Untitled event — ${dateLabel}`;
    const slug = slugify(`event-${dateLabel}-${timeLabel}`, { lower: true, strict: true });

    const existing = await prisma.tag.findUnique({ where: { slug } });
    const tag =
      existing ??
      (await prisma.tag.create({
        data: {
          kind: 'EVENT',
          name,
          slug,
          startAt,
          endAt,
          isVisible: false, // admin reviews, names, then publishes
          source: 'time-cluster',
          coverAssetId: cluster.ids[0],
        },
      }));

    await prisma.assetTag.createMany({
      data: cluster.ids.map((assetId) => ({ assetId, tagId: tag.id })),
      skipDuplicates: true,
    });
    created++;
    console.log(`  ${tag.slug}: ${cluster.ids.length} photos (${startAt.toISOString()} → ${endAt.toISOString()})`);
  }

  console.log(`\nDone. ${created} candidate events ready for review in /admin.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
