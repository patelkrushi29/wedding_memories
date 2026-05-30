import * as fs from 'fs';
import * as path from 'path';
import { prisma } from './db';

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
