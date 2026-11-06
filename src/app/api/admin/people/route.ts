import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdminAuthorized } from '@/lib/adminAuth';
import { faceCropUrl } from '@/lib/people/faceUrl';

/** Everyone the face pipeline found, hidden ones included, biggest first. */
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const tags = await prisma.tag.findMany({
    where: { kind: 'PERSON' },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, slug: true, name: true, isVisible: true, updatedAt: true, _count: { select: { assets: true } } },
  });
  return NextResponse.json(
    tags.map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name,
      isVisible: t.isVisible,
      photoCount: t._count.assets,
      faceUrl: faceCropUrl(t.id, t.updatedAt),
    }))
  );
}
