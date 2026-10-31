import { prisma } from '@/lib/db';
import { thumbnailUrlFor, attachMediaUrls } from '@/lib/storage/assetUrls';
import type { Asset } from '@/types/asset';

const GUEST_ASSET_WHERE = { isHidden: false, isAvailable: true } as const;

type AttachedAsset = ReturnType<typeof attachMediaUrls> & {
  id: string;
  type: string;
  filename: string;
  fileSizeBytes: number;
  width: number | null;
  height: number | null;
  durationSeconds: number | null;
  takenAt: Date | null;
  blurDataUrl: string | null;
  album?: { title: string; slug: string } | null;
};

/** Shape a DB row for client components: dates as ISO strings, no internal paths. */
/** The only asset fields a guest's browser receives. Everything else stays server-side. */
export function toClientAsset(a: AttachedAsset): Asset {
  return {
    id: a.id,
    type: a.type,
    filename: a.filename,
    thumbnailUrl: a.thumbnailUrl,
    previewUrl: a.previewUrl,
    fullUrl: a.fullUrl,
    downloadUrl: a.downloadUrl,
    fileSizeBytes: a.fileSizeBytes,
    width: a.width,
    height: a.height,
    durationSeconds: a.durationSeconds,
    takenAt: a.takenAt ? a.takenAt.toISOString() : null,
    blurDataUrl: a.blurDataUrl,
    album: a.album ?? null,
  };
}

/**
 * Columns never read for guest pages. The CLIP and outfit embeddings are ~512
 * floats each — reading them for a 60-photo page moved over a megabyte from the
 * database for nothing.
 */
export const GUEST_ASSET_OMIT = {
  embedding: true,
  outfitEmbedding: true,
  checksum: true,
} as const;

export interface FunctionSummary {
  id: string;
  name: string;
  slug: string;
  startAt: string | null;
  endAt: string | null;
  photoCount: number;
  videoCount: number;
  assetCount: number;
  coverThumbnailUrl: string | null;
  coverBlurDataUrl: string | null;
}

export interface DaySummary {
  id: string;
  name: string;
  slug: string;
  date: string | null;
  functions: FunctionSummary[];
}

type CoverAsset = {
  id: string;
  thumbnailPath: string | null;
  posterPath: string | null;
  filename: string;
  blurDataUrl: string | null;
};

function coverUrls(cover: CoverAsset | null) {
  return {
    coverThumbnailUrl: cover ? thumbnailUrlFor(cover) : null,
    coverBlurDataUrl: cover?.blurDataUrl ?? null,
  };
}

async function summarizeFunction(tag: {
  id: string;
  name: string;
  slug: string;
  startAt: Date | null;
  endAt: Date | null;
  coverAssetId: string | null;
}): Promise<FunctionSummary> {
  const [typeCounts, cover] = await Promise.all([
    prisma.asset.groupBy({
      by: ['type'],
      where: { ...GUEST_ASSET_WHERE, tags: { some: { tagId: tag.id } } },
      _count: { _all: true },
    }),
    (async () => {
      const select = {
        id: true,
        thumbnailPath: true,
        posterPath: true,
        filename: true,
        blurDataUrl: true,
      };
      if (tag.coverAssetId) {
        const explicit = await prisma.asset.findFirst({
          where: { id: tag.coverAssetId, ...GUEST_ASSET_WHERE },
          select,
        });
        if (explicit) return explicit;
      }
      const first = await prisma.assetTag.findFirst({
        where: { tagId: tag.id, asset: { ...GUEST_ASSET_WHERE, type: 'PHOTO' } },
        orderBy: { asset: { takenAt: 'asc' } },
        select: { asset: { select } },
      });
      return first?.asset ?? null;
    })(),
  ]);

  const photoCount = typeCounts.find((c) => c.type === 'PHOTO')?._count._all ?? 0;
  const videoCount = typeCounts.find((c) => c.type === 'VIDEO')?._count._all ?? 0;

  return {
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    startAt: tag.startAt ? tag.startAt.toISOString() : null,
    endAt: tag.endAt ? tag.endAt.toISOString() : null,
    photoCount,
    videoCount,
    assetCount: photoCount + videoCount,
    ...coverUrls(cover),
  };
}

/** The spine: days in order, each with its published functions. Empty days are dropped. */
export async function getDaysWithFunctions(): Promise<DaySummary[]> {
  const days = await prisma.tag.findMany({
    where: { kind: 'DAY' },
    orderBy: [{ startAt: 'asc' }, { createdAt: 'asc' }],
    include: {
      children: {
        where: { kind: 'FUNCTION', isVisible: true },
        orderBy: [{ startAt: 'asc' }, { sortOrder: 'asc' }],
      },
    },
  });

  const result: DaySummary[] = [];
  for (const day of days) {
    const functions = (await Promise.all(day.children.map(summarizeFunction))).filter(
      (f) => f.assetCount > 0
    );
    if (functions.length === 0) continue;
    result.push({
      id: day.id,
      name: day.name,
      slug: day.slug,
      date: day.startAt ? day.startAt.toISOString() : null,
      functions,
    });
  }
  return result;
}

/** Flat list of published functions — for chips, facets, and the admin picker. */
export async function listFunctions(): Promise<FunctionSummary[]> {
  const tags = await prisma.tag.findMany({
    where: { kind: 'FUNCTION', isVisible: true },
    orderBy: [{ startAt: 'asc' }, { sortOrder: 'asc' }],
  });
  const summaries = await Promise.all(tags.map(summarizeFunction));
  return summaries.filter((f) => f.assetCount > 0);
}

export async function getFunctionBySlug(slug: string) {
  const tag = await prisma.tag.findUnique({
    where: { slug },
    include: { parent: true },
  });
  if (!tag || tag.kind !== 'FUNCTION' || !tag.isVisible) return null;
  const summary = await summarizeFunction(tag);
  return {
    ...summary,
    dayName: tag.parent?.name ?? null,
    daySlug: tag.parent?.slug ?? null,
  };
}

/** Same order the API cursors through, so page 2 continues page 1 exactly. */
export const FUNCTION_ORDER = [{ takenAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }] as const;

/**
 * Near-identical frames folded behind their best take (see scripts/pick-best.ts).
 * A quality MOMENT tag's AssetTag rows are exactly the folded frames; the lead
 * carries no row, so "not folded" is a plain none-filter.
 */
export const NOT_FOLDED = { tags: { none: { tag: { kind: 'MOMENT', source: 'quality' } } } } as const;

/** Attach `burst` ({ slug, size }) to any asset that leads a folded burst. */
export async function withBursts(assets: Asset[]): Promise<Asset[]> {
  if (assets.length === 0) return assets;
  const moments = await prisma.tag.findMany({
    where: { kind: 'MOMENT', source: 'quality', coverAssetId: { in: assets.map((a) => a.id) } },
    select: { slug: true, coverAssetId: true, _count: { select: { assets: true } } },
  });
  if (moments.length === 0) return assets;
  const byLead = new Map(moments.map((m) => [m.coverAssetId!, { slug: m.slug, size: m._count.assets + 1 }]));
  return assets.map((a) => (byLead.has(a.id) ? { ...a, burst: byLead.get(a.id)! } : a));
}

/** First page of a function's media, oldest-first, bursts folded. */
export async function getFunctionAssets(tagId: string, take = 60): Promise<{ items: Asset[]; total: number }> {
  const where = { ...GUEST_ASSET_WHERE, AND: [NOT_FOLDED, { tags: { some: { tagId } } }] };
  const [rows, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: [...FUNCTION_ORDER],
      take,
      omit: GUEST_ASSET_OMIT,
      include: { album: { select: { title: true, slug: true } } },
    }),
    prisma.asset.count({ where }),
  ]);
  const items = rows.map((r) => toClientAsset(attachMediaUrls(r) as AttachedAsset));
  return { items: await withBursts(items), total };
}

/** Evenly spaced picks from an ordered list — the fallback "highlights". */
function spread<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list;
  return Array.from({ length: n }, (_, i) => list[Math.floor(((i + 0.5) * list.length) / n)]);
}

/**
 * The best of one function, in shooting order. Uses the picker's highlights when
 * it has run; otherwise an even spread across the function's timeline, which is
 * a far better story than "the first 12".
 */
export async function getFunctionHighlights(tagId: string, limit = 12): Promise<Asset[]> {
  const base = { ...GUEST_ASSET_WHERE, type: 'PHOTO', tags: { some: { tagId } } };
  let rows = await prisma.asset.findMany({
    where: { ...base, isHighlight: true },
    orderBy: [...FUNCTION_ORDER],
    omit: GUEST_ASSET_OMIT,
  });
  if (rows.length === 0) {
    const ids = await prisma.asset.findMany({
      where: { ...GUEST_ASSET_WHERE, type: 'PHOTO', AND: [NOT_FOLDED, { tags: { some: { tagId } } }] },
      orderBy: [...FUNCTION_ORDER],
      select: { id: true },
    });
    const picked = spread(ids, limit).map((r) => r.id);
    rows = await prisma.asset.findMany({
      where: { id: { in: picked } },
      orderBy: [...FUNCTION_ORDER],
      omit: GUEST_ASSET_OMIT,
    });
  }
  return spread(rows, limit).map((r) => toClientAsset(attachMediaUrls(r) as AttachedAsset));
}

export interface ReelSlide extends Asset {
  functionName: string;
  functionSlug: string;
}

/** "Watch the weekend": highlights across every published function, in order. */
export async function getWeekendReel(perFunction = 5): Promise<ReelSlide[]> {
  const functions = await prisma.tag.findMany({
    where: { kind: 'FUNCTION', isVisible: true },
    orderBy: [{ startAt: 'asc' }, { sortOrder: 'asc' }],
    select: { id: true, name: true, slug: true },
  });
  const parts = await Promise.all(
    functions.map(async (fn) =>
      (await getFunctionHighlights(fn.id, perFunction)).map((a) => ({
        ...a,
        functionName: fn.name,
        functionSlug: fn.slug,
      }))
    )
  );
  return parts.flat();
}

/** Totals for the header line: "3 days · 5 functions · 8,412". */
export async function getGalleryTotals() {
  const [days, functions, photos, videos] = await Promise.all([
    prisma.tag.count({ where: { kind: 'DAY' } }),
    prisma.tag.count({ where: { kind: 'FUNCTION', isVisible: true } }),
    prisma.asset.count({ where: { ...GUEST_ASSET_WHERE, type: 'PHOTO' } }),
    prisma.asset.count({ where: { ...GUEST_ASSET_WHERE, type: 'VIDEO' } }),
  ]);
  return { days, functions, photos, videos, total: photos + videos };
}

/** Fallback for a gallery with no published functions yet. */
export async function getRecentAssets(take = 24): Promise<Asset[]> {
  const assets = await prisma.asset.findMany({
    where: GUEST_ASSET_WHERE,
    orderBy: [{ takenAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }],
    take,
    omit: GUEST_ASSET_OMIT,
    include: { album: { select: { title: true, slug: true } } },
  });
  return assets.map((a) => toClientAsset(attachMediaUrls(a) as AttachedAsset));
}
