import 'dotenv/config';
import { prisma } from './db';

async function main() {
  const tags = await prisma.tag.findMany({
    orderBy: [{ kind: 'asc' }, { slug: 'asc' }],
    select: {
      kind: true,
      name: true,
      slug: true,
      source: true,
      isVisible: true,
      _count: { select: { assets: true } },
    },
  });
  for (const t of tags) {
    console.log(
      `  ${t.kind.padEnd(9)} ${t.slug.padEnd(26)} ${(t.name ?? '').padEnd(18)} ` +
        `${(t.source ?? '-').padEnd(13)} visible=${t.isVisible} assets=${t._count.assets}`
    );
  }
  await prisma.$disconnect();
}

main();
