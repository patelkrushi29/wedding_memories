import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { thumbnailUrlFor } from '@/lib/storage/assetUrls';

export async function GET() {
  const albums = await prisma.album.findMany({
    where: { isHidden: false },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      _count: {
        select: { assets: true },
      },
      assets: {
        where: { isHidden: false, isAvailable: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { id: true, thumbnailPath: true, filename: true },
      },
    },
  });

  const result = albums.map((album) => ({
    id: album.id,
    title: album.title,
    slug: album.slug,
    photoCount: 0,
    videoCount: 0,
    totalCount: album._count.assets,
    coverThumbnailUrl: album.assets[0] ? thumbnailUrlFor(album.assets[0]) : null,
  }));

  return NextResponse.json(result);
}
