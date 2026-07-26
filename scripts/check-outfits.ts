import 'dotenv/config';
import { prisma } from './db';

async function main() {
  const total = await prisma.asset.count({ where: { type: 'PHOTO' } });
  const attempted = await prisma.asset.count({ where: { outfitAt: { not: null } } });
  const withPeople = await prisma.asset.count({ where: { outfitPeople: { gt: 0 } } });
  const agg = await prisma.asset.aggregate({
    where: { outfitPeople: { gt: 0 } },
    _avg: { outfitPeople: true },
    _max: { outfitPeople: true },
  });
  console.log(
    `photos ${total} · processed ${attempted} · with a legible person ${withPeople} · ` +
      `avg torsos ${(agg._avg.outfitPeople ?? 0).toFixed(1)} (max ${agg._max.outfitPeople ?? 0})`
  );
  await prisma.$disconnect();
}

main();
