/**
 * Delete asset rows whose original file is no longer in R2, plus any tag that
 * ends up empty. Use after deliberately removing files from the bucket.
 *
 * Usage: npx tsx scripts/prune-missing.ts [--dry]
 */
import 'dotenv/config';
import { prisma } from './db';
import { listR2Objects } from './r2';

const dry = process.argv.includes('--dry');

async function main() {
  const present = new Set((await listR2Objects('media/')).map((o) => o.key));
  const assets = await prisma.asset.findMany({ select: { id: true, originalPath: true, filename: true } });
  const orphans = assets.filter((a) => !present.has(a.originalPath));

  console.log(`${assets.length} rows, ${present.size} files in R2 media/`);
  console.log(`${orphans.length} rows point at files that no longer exist`);

  if (orphans.length === 0) {
    await prisma.$disconnect();
    return;
  }
  if (dry) {
    orphans.slice(0, 10).forEach((o) => console.log(`  would delete ${o.filename}`));
    await prisma.$disconnect();
    return;
  }

  const { count } = await prisma.asset.deleteMany({ where: { id: { in: orphans.map((o) => o.id) } } });
  console.log(`Deleted ${count} orphaned rows (AssetTag rows cascade)`);

  // Drop groupings that no longer contain anything
  const tags = await prisma.tag.findMany({
    where: { kind: 'FUNCTION' },
    include: { _count: { select: { assets: true } } },
  });
  const empty = tags.filter((t) => t._count.assets === 0);
  if (empty.length) {
    await prisma.tag.deleteMany({ where: { id: { in: empty.map((t) => t.id) } } });
    console.log(`Deleted ${empty.length} now-empty function(s): ${empty.map((t) => t.name).join(', ')}`);
  }

  const days = await prisma.tag.findMany({
    where: { kind: 'DAY' },
    include: { _count: { select: { children: true } } },
  });
  const emptyDays = days.filter((d) => d._count.children === 0);
  if (emptyDays.length) {
    await prisma.tag.deleteMany({ where: { id: { in: emptyDays.map((d) => d.id) } } });
    console.log(`Deleted ${emptyDays.length} now-empty day(s)`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
