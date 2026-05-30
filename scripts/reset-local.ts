import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Resetting local database...');
  await prisma.asset.deleteMany();
  await prisma.album.deleteMany();
  console.log('Deleted all assets and albums.');

  const generatedDir = path.join(process.cwd(), 'public', 'generated');
  if (fs.existsSync(generatedDir)) {
    fs.rmSync(generatedDir, { recursive: true });
    console.log('Deleted public/generated/ folder.');
  }

  await prisma.$disconnect();
  console.log('Reset complete.');
}

main().catch(console.error);
