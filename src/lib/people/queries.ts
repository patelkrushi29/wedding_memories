import { prisma } from '@/lib/db';
import { attachMediaUrls } from '@/lib/storage/assetUrls';
import { GUEST_ASSET_OMIT, NOT_FOLDED, toClientAsset } from '@/lib/tags/queries';
import { faceCropUrl } from './faceUrl';
import type { PersonDetail, PersonSummary } from './eventsSentence';

export type { PersonDetail, PersonSummary };
export { eventsSentence } from './eventsSentence';
import type { Asset } from '@/types/asset';

const GUEST = { isHidden: false, isAvailable: true } as const;

/** Everyone on the face wall: visible PERSON tags with their photo counts. */
export async function listPeople(): Promise<PersonSummary[]> {
  const tags = await prisma.tag.findMany({
    where: { kind: 'PERSON', isVisible: true },
    select: {
      id: true,
      slug: true,
      name: true,
      updatedAt: true,
      _count: { select: { assets: { where: { asset: GUEST } } } },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  return tags
    .filter((t) => t._count.assets > 0)
    .map((t) => ({
      id: t.id,
      slug: t.slug,
      name: t.name || null,
      photoCount: t._count.assets,
      faceThumbnailUrl: faceCropUrl(t.id, t.updatedAt),
      isPinned: Boolean(t.name),
    }));
}

export async function getPerson(slug: string): Promise<PersonDetail | null> {
  const tag = await prisma.tag.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, kind: true, isVisible: true, updatedAt: true },
  });
  if (!tag || tag.kind !== 'PERSON' || !tag.isVisible) return null;

  const [photoCount, fnRows] = await Promise.all([
    prisma.assetTag.count({ where: { tagId: tag.id, asset: GUEST } }),
    prisma.tag.findMany({
      where: { kind: 'FUNCTION', isVisible: true },
      orderBy: [{ startAt: 'asc' }, { sortOrder: 'asc' }],
      select: {
        slug: true,
        name: true,
        _count: {
          select: { assets: { where: { asset: { ...GUEST, tags: { some: { tagId: tag.id } } } } } },
        },
      },
    }),
  ]);

  return {
    id: tag.id,
    slug: tag.slug,
    name: tag.name || null,
    photoCount,
    faceThumbnailUrl: faceCropUrl(tag.id, tag.updatedAt),
    functions: fnRows.filter((f) => f._count.assets > 0).map((f) => ({ slug: f.slug, name: f.name, count: f._count.assets })),
  };
}

/**
 * A person's best photos, in shooting order (the story of their day). Comes from
 * the BEST tag find-faces writes; falls back to their photos minus folded bursts.
 */
export async function getPersonBest(personId: string, limit = 24): Promise<Asset[]> {
  const order = [{ takenAt: { sort: 'asc' as const, nulls: 'last' as const } }, { id: 'asc' as const }];
  let rows = await prisma.asset.findMany({
    where: { ...GUEST, tags: { some: { tag: { kind: 'BEST', parentId: personId } } } },
    orderBy: order,
    take: limit,
    omit: GUEST_ASSET_OMIT,
  });
  if (rows.length === 0) {
    rows = await prisma.asset.findMany({
      where: { ...GUEST, AND: [NOT_FOLDED, { tags: { some: { tagId: personId } } }] },
      orderBy: order,
      take: limit,
      omit: GUEST_ASSET_OMIT,
    });
  }
  return rows.map((r) => toClientAsset(attachMediaUrls(r)));
}
