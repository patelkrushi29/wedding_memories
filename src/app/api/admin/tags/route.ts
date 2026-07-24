import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { thumbnailUrlFor } from '@/lib/storage/assetUrls';
import { isAdminAuthorized } from '@/lib/adminAuth';

/** All EVENT tags (including hidden candidates) with counts and sample thumbnails. */
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tags = await prisma.tag.findMany({
    where: { kind: 'EVENT' },
    orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
  });

  const result = [];
  for (const tag of tags) {
    const [count, samples] = await Promise.all([
      prisma.assetTag.count({ where: { tagId: tag.id } }),
      prisma.assetTag.findMany({
        where: { tagId: tag.id },
        take: 4,
        orderBy: { asset: { takenAt: 'asc' } },
        select: {
          asset: { select: { id: true, thumbnailPath: true, posterPath: true, filename: true } },
        },
      }),
    ]);

    result.push({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      isVisible: tag.isVisible,
      source: tag.source,
      startAt: tag.startAt,
      endAt: tag.endAt,
      assetCount: count,
      sampleThumbnails: samples.map((s) => thumbnailUrlFor(s.asset)),
    });
  }

  return NextResponse.json(result);
}
