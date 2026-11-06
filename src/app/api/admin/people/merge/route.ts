import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminAuthorized } from '@/lib/adminAuth';

/**
 * Merge person `from` into person `into` — for when face grouping split one
 * person in two. `into` keeps its slug (so guests' "That's me" still points at
 * it) and name; `from`'s photos move over. find-faces keeps the merge on re-runs.
 */
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { from, into } = await request.json().catch(() => ({}));
  if (typeof from !== 'string' || typeof into !== 'string' || from === into) {
    return NextResponse.json({ error: 'Give two different people' }, { status: 400 });
  }
  const tags = await prisma.tag.findMany({ where: { id: { in: [from, into] }, kind: 'PERSON' }, select: { id: true, name: true } });
  if (tags.length !== 2) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const fromTag = tags.find((t) => t.id === from)!;
  const intoTag = tags.find((t) => t.id === into)!;

  const rows = await prisma.assetTag.findMany({ where: { tagId: from }, select: { assetId: true } });
  await prisma.$transaction([
    prisma.assetTag.createMany({ data: rows.map((r) => ({ assetId: r.assetId, tagId: into })), skipDuplicates: true }),
    prisma.tag.deleteMany({ where: { OR: [{ id: from }, { kind: 'BEST', parentId: from }] } }),
    ...(intoTag.name || !fromTag.name ? [] : [prisma.tag.update({ where: { id: into }, data: { name: fromTag.name } })]),
  ]);
  return NextResponse.json({ ok: true, moved: rows.length });
}
