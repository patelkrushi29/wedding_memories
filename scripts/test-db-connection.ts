import { prisma } from './db';

async function main() {
  const count = await prisma.album.count();
  console.log('Supabase OK — album count:', count);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Database connection failed:', e.message);
    process.exit(1);
  });
