import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

function resolveDbUrl(raw: string): string {
  if (raw.startsWith('file:///')) return raw;
  const filePart = raw.replace(/^file:\.?\//, '');
  const absolutePath = path.resolve(process.cwd(), filePart);
  return `file://${absolutePath}`;
}

const rawUrl = process.env.DATABASE_URL || 'file:./dev.db';
const url = resolveDbUrl(rawUrl);
const adapter = new PrismaLibSql({ url });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const prisma = new PrismaClient({ adapter } as any);
