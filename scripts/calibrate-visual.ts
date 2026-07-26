/**
 * Measure the similarity distribution before trusting any threshold.
 *
 * Two numbers decide whether segmentation is even possible:
 *   - adjacent frames (same camera, consecutive filenames) — the "same scene" case
 *   - random pairs — the "unrelated" case
 *
 * If those overlap heavily the library is visually homogeneous and no threshold
 * will separate events. If they're well apart, the boundary sits between them.
 */
import 'dotenv/config';
import { prisma } from './db';
import { cosine } from './clip';

function quantile(sorted: number[], q: number): number {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

function describe(name: string, values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  console.log(
    `  ${name.padEnd(22)} n=${String(values.length).padStart(5)}  ` +
      `p05 ${quantile(sorted, 0.05).toFixed(3)}  p25 ${quantile(sorted, 0.25).toFixed(3)}  ` +
      `median ${quantile(sorted, 0.5).toFixed(3)}  p75 ${quantile(sorted, 0.75).toFixed(3)}  ` +
      `p95 ${quantile(sorted, 0.95).toFixed(3)}  mean ${mean.toFixed(3)}`
  );
  return sorted;
}

async function main() {
  const rows = await prisma.asset.findMany({
    where: { type: 'PHOTO', embeddedAt: { not: null } },
    select: { filename: true, embedding: true },
    orderBy: { filename: 'asc' },
  });
  const photos = rows.filter((r) => r.embedding.length > 0);
  console.log(`${photos.length} embedded photos\n`);

  const byCamera = new Map<string, typeof photos>();
  for (const p of photos) {
    const cam = (p.filename.match(/^[A-Za-z_]+/) ?? ['unknown'])[0];
    if (!byCamera.has(cam)) byCamera.set(cam, []);
    byCamera.get(cam)!.push(p);
  }

  const adjacent: number[] = [];
  const nearby: number[] = [];
  for (const list of byCamera.values()) {
    for (let i = 1; i < list.length; i++) {
      adjacent.push(cosine(list[i - 1].embedding, list[i].embedding));
    }
    for (let i = 10; i < list.length; i++) {
      nearby.push(cosine(list[i - 10].embedding, list[i].embedding));
    }
  }

  const random: number[] = [];
  for (let n = 0; n < 4000; n++) {
    const a = photos[Math.floor(Math.random() * photos.length)];
    const b = photos[Math.floor(Math.random() * photos.length)];
    if (a !== b) random.push(cosine(a.embedding, b.embedding));
  }

  console.log('Similarity distributions:\n');
  const adj = describe('adjacent frames', adjacent);
  describe('10 frames apart', nearby);
  const rnd = describe('random pairs', random);

  // A threshold wants to sit below the "same scene" mass and above the noise
  const suggestion = (quantile(adj, 0.25) + quantile(rnd, 0.9)) / 2;
  const separation = quantile(adj, 0.5) - quantile(rnd, 0.5);

  console.log(`\n  separation (median adjacent − median random): ${separation.toFixed(3)}`);
  console.log(`  suggested --threshold ≈ ${suggestion.toFixed(2)}`);
  console.log(
    separation > 0.12
      ? '  There is real structure here — segmentation should work.'
      : '  Weak separation: these photographs look alike to the model. Expect coarse groups only.'
  );

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
