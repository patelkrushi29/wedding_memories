import { prisma } from '@/lib/db';
import { thumbnailUrlFor, attachMediaUrls } from '@/lib/storage/assetUrls';

const GUEST_ASSET_WHERE = { isHidden: false, isAvailable: true } as const;

/** Visible EVENT tags with counts and cover thumbnails, ordered chronologically. */
export async function listEventTags() {
  const tags = await prisma.tag.findMany({
    where: { kind: 'EVENT', isVisible: true },
    orderBy: [{ startAt: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  });

  const results = [];
  for (const tag of tags) {
    const [assetCount, cover] = await Promise.all([
      prisma.assetTag.count({ where: { tagId: tag.id, asset: GUEST_ASSET_WHERE } }),
      tag.coverAssetId
        ? prisma.asset.findUnique({
            where: { id: tag.coverAssetId },
            select: { id: true, thumbnailPath: true, posterPath: true, filename: true },
          })
        : prisma.assetTag
            .findFirst({
              where: { tagId: tag.id, asset: GUEST_ASSET_WHERE },
              orderBy: { asset: { takenAt: 'asc' } },
              select: {
                asset: {
                  select: { id: true, thumbnailPath: true, posterPath: true, filename: true },
                },
              },
            })
            .then((at) => at?.asset ?? null),
    ]);

    results.push({
      id: tag.id,
      kind: tag.kind,
      name: tag.name,
      slug: tag.slug,
      startAt: tag.startAt,
      endAt: tag.endAt,
      assetCount,
      coverThumbnailUrl: cover ? thumbnailUrlFor(cover) : null,
    });
  }

  return results;
}

/** Feed sections: each visible EVENT tag with a handful of teaser assets. */
export async function getFeedSections(teaserCount = 6) {
  const tags = await listEventTags();

  const sections = [];
  for (const tag of tags) {
    if (tag.assetCount === 0) continue;
    const assetTags = await prisma.assetTag.findMany({
      where: { tagId: tag.id, asset: GUEST_ASSET_WHERE },
      orderBy: { asset: { takenAt: 'asc' } },
      take: teaserCount,
      include: { asset: { include: { album: { select: { title: true, slug: true } } } } },
    });
    sections.push({
      tag,
      assets: assetTags.map((at) => attachMediaUrls(at.asset)),
    });
  }
  return sections;
}

/** Highlight assets for the top of the feed. */
export async function getHighlights(take = 8) {
  const assets = await prisma.asset.findMany({
    where: { ...GUEST_ASSET_WHERE, isHighlight: true, type: 'PHOTO' },
    orderBy: [{ takenAt: { sort: 'asc', nulls: 'last' } }],
    take,
    include: { album: { select: { title: true, slug: true } } },
  });
  return assets.map((a) => attachMediaUrls(a));
}

/** Recent photos fallback when no events/highlights exist yet. */
export async function getRecentPhotos(take = 12) {
  const assets = await prisma.asset.findMany({
    where: { ...GUEST_ASSET_WHERE, type: 'PHOTO' },
    orderBy: [{ takenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    take,
    include: { album: { select: { title: true, slug: true } } },
  });
  return assets.map((a) => attachMediaUrls(a));
}
