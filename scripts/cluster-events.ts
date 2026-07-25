/**
 * Build the day → function spine from timestamps.
 *
 * Functions are runs of photos separated by more than GAP_HOURS. Days are the
 * calendar dates those functions fall on. Functions are created hidden — the
 * host names them in /admin and publishes; days publish themselves once any
 * child function is visible.
 *
 * Usage:
 *   npm run cluster:events
 *   npm run cluster:events -- --gap=6
 */
import 'dotenv/config';
import slugify from 'slugify';
import { prisma } from './db';

const gapArg = process.argv.find((a) => a.startsWith('--gap='));
const GAP_HOURS = gapArg ? parseFloat(gapArg.split('=')[1]) : 3;
const GAP_MS = GAP_HOURS * 60 * 60 * 1000;
const MIN_CLUSTER_SIZE = 3; // stray singletons get tagged by hand instead

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** "Thursday 12 June" — the day heading voice from the design. */
function dayLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d);
}

async function getOrCreateDay(date: Date) {
  const key = dayKey(date);
  const slug = slugify(`day-${key}`, { lower: true, strict: true });
  const existing = await prisma.tag.findUnique({ where: { slug } });
  if (existing) return existing;

  const startOfDay = new Date(`${key}T00:00:00.000Z`);
  return prisma.tag.create({
    data: {
      kind: 'DAY',
      name: dayLabel(date),
      slug,
      startAt: startOfDay,
      endAt: new Date(startOfDay.getTime() + 86_399_000),
      isVisible: true, // days are containers; visibility is governed by their functions
      source: 'time-cluster',
      sortOrder: 0,
    },
  });
}

/** Functions created before days existed (or after a day was deleted) get a parent. */
async function adoptOrphanFunctions() {
  const orphans = await prisma.tag.findMany({
    where: { kind: 'FUNCTION', parentId: null },
  });
  for (const fn of orphans) {
    const anchor =
      fn.startAt ??
      (
        await prisma.assetTag.findFirst({
          where: { tagId: fn.id },
          orderBy: { asset: { takenAt: 'asc' } },
          select: { asset: { select: { takenAt: true, modifiedAt: true } } },
        })
      )?.asset?.takenAt ??
      null;
    if (!anchor) continue;
    const day = await getOrCreateDay(anchor);
    await prisma.tag.update({
      where: { id: fn.id },
      data: { parentId: day.id, startAt: fn.startAt ?? anchor },
    });
    console.log(`  adopted "${fn.name}" into ${day.name}`);
  }
}

async function main() {
  await adoptOrphanFunctions();

  const assets = await prisma.asset.findMany({
    where: {
      isAvailable: true,
      isHidden: false,
      tags: { none: { tag: { kind: 'FUNCTION' } } },
    },
    select: { id: true, takenAt: true, modifiedAt: true },
  });

  // EXIF capture time when we have it, upload time as the fallback
  const timed = assets
    .map((a) => ({ id: a.id, t: (a.takenAt ?? a.modifiedAt).getTime() }))
    .sort((a, b) => a.t - b.t);

  console.log(`Clustering ${timed.length} unassigned assets (gap: ${GAP_HOURS}h)`);

  // Without capture times this is clustering upload times, which is meaningless.
  const withExif = assets.filter((a) => a.takenAt !== null).length;
  if (timed.length > 0 && withExif / timed.length < 0.5) {
    console.warn(
      `\n  ⚠ Only ${withExif}/${timed.length} assets have an EXIF capture time.\n` +
        `    Everything else falls back to upload time, so the functions below are grouped by\n` +
        `    when files were uploaded — not when the photographs were taken. Re-upload camera\n` +
        `    originals (metadata intact) for real day/function detection.\n`
    );
  }
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
  console.log(`Found ${clusters.length} runs, ${keep.length} with >= ${MIN_CLUSTER_SIZE} photos`);

  let created = 0;
  const daysTouched = new Set<string>();

  for (const cluster of keep) {
    const startAt = new Date(cluster.start);
    const endAt = new Date(cluster.end);
    const key = dayKey(startAt);
    const timeLabel = startAt.toISOString().slice(11, 16).replace(':', '');

    const day = await getOrCreateDay(startAt);
    daysTouched.add(day.slug);

    const slug = slugify(`function-${key}-${timeLabel}`, { lower: true, strict: true });
    const existing = await prisma.tag.findUnique({ where: { slug } });
    const tag =
      existing ??
      (await prisma.tag.create({
        data: {
          kind: 'FUNCTION',
          name: 'Untitled function',
          slug,
          parentId: day.id,
          startAt,
          endAt,
          isVisible: false, // host names it, then publishes
          source: 'time-cluster',
          coverAssetId: cluster.ids[0],
          sortOrder: startAt.getUTCHours() * 60 + startAt.getUTCMinutes(),
        },
      }));

    await prisma.assetTag.createMany({
      data: cluster.ids.map((assetId) => ({ assetId, tagId: tag.id })),
      skipDuplicates: true,
    });
    created++;

    const hhmm = (d: Date) => d.toISOString().slice(11, 16);
    console.log(
      `  ${day.name} · ${tag.slug}: ${cluster.ids.length} photos (${hhmm(startAt)}–${hhmm(endAt)})`
    );
  }

  console.log(
    `\nDone. ${created} functions across ${daysTouched.size} day(s), waiting to be named in /admin.`
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
