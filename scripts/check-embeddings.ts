import 'dotenv/config';
import { prisma } from './db';

async function main() {
  const rows = await prisma.$queryRawUnsafe<
    { total: bigint; nulls: bigint; empties: bigint; filled: bigint }[]
  >(
    `SELECT count(*) AS total,
            count(*) FILTER (WHERE embedding IS NULL) AS nulls,
            count(*) FILTER (WHERE embedding IS NOT NULL AND cardinality(embedding) = 0) AS empties,
            count(*) FILTER (WHERE cardinality(embedding) > 0) AS filled
       FROM "Asset"`
  );
  const r = rows[0];
  console.log(
    `total ${r.total} · null ${r.nulls} · empty ${r.empties} · with vector ${r.filled}`
  );
  await prisma.$disconnect();
}

main();
