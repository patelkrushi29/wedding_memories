import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import path from 'path';

function resolveDbUrl(raw: string): string {
  // Convert "file:./dev.db" or "file:dev.db" to absolute "file:///abs/path/dev.db"
  if (raw.startsWith('file:///')) return raw;
  const filePart = raw.replace(/^file:\.?\//, '');
  const absolutePath = path.resolve(process.cwd(), filePart);
  return `file://${absolutePath}`;
}

function createPrismaClient() {
  const rawUrl = process.env.DATABASE_URL || 'file:./dev.db';
  const url = resolveDbUrl(rawUrl);
  const adapter = new PrismaLibSql({ url });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
