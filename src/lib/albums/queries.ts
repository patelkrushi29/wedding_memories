import { prisma } from '@/lib/db';
import { thumbnailUrlFor } from '@/lib/storage/assetUrls';

export async function listAlbumsForGallery() {
  const [albums, typeCounts] = await Promise.all([
    prisma.album.findMany({
      where: { isHidden: false },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        assets: {
          where: { isHidden: false, isAvailable: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { id: true, thumbnailPath: true, posterPath: true, filename: true },
        },
      },
    }),
    prisma.asset.groupBy({
      by: ['albumId', 'type'],
      where: { isHidden: false, isAvailable: true },
      _count: { _all: true },
    }),
  ]);

  const countFor = (albumId: string, type: string) =>
    typeCounts.find((c) => c.albumId === albumId && c.type === type)?._count._all ?? 0;

  return albums.map((album) => {
    const photoCount = countFor(album.id, 'PHOTO');
    const videoCount = countFor(album.id, 'VIDEO');
    return {
      id: album.id,
      title: album.title,
      slug: album.slug,
      photoCount,
      videoCount,
      totalCount: photoCount + videoCount,
      coverThumbnailUrl: album.assets[0] ? thumbnailUrlFor(album.assets[0]) : null,
    };
  });
}
