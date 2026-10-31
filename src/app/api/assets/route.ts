import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { attachMediaUrls } from '@/lib/storage/assetUrls';
import { GUEST_ASSET_OMIT, NOT_FOLDED, toClientAsset, withBursts } from '@/lib/tags/queries';
import type { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const albumSlug = searchParams.get('album');
  // "function" is the current name; "event" kept for older links
  const tagSlug = searchParams.get('function') || searchParams.get('event');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'newest';
  const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1);
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '60') || 60));
  const ids = searchParams.get('ids');
  const cursor = searchParams.get('cursor');
  // fold=1 hides near-identical frames behind their best take; burst=<slug> lists every take of one moment.
  const fold = searchParams.get('fold') === '1';
  const burstSlug = searchParams.get('burst');
  const skip = (page - 1) * limit;

  const where: Prisma.AssetWhereInput = {
    isHidden: false,
    isAvailable: true,
  };

  if (type) where.type = type.toUpperCase();
  if (search) where.filename = { contains: search, mode: 'insensitive' };
  if (ids) {
    const idList = ids.split(',').filter(Boolean);
    where.id = { in: idList };
  }

  if (albumSlug) {
    const album = await prisma.album.findUnique({ where: { slug: albumSlug } });
    if (album) where.albumId = album.id;
  }

  const and: Prisma.AssetWhereInput[] = [];
  if (tagSlug) and.push({ tags: { some: { tag: { slug: tagSlug, isVisible: true } } } });
  if (fold) and.push(NOT_FOLDED);
  if (burstSlug) {
    const moment = await prisma.tag.findUnique({
      where: { slug: burstSlug },
      select: { kind: true, source: true, coverAssetId: true },
    });
    if (!moment || moment.kind !== 'MOMENT') {
      return NextResponse.json({ items: [], page, limit, total: 0, hasMore: false, nextCursor: null });
    }
    and.push({
      OR: [
        { tags: { some: { tag: { slug: burstSlug } } } },
        ...(moment.coverAssetId ? [{ id: moment.coverAssetId }] : []),
      ],
    });
  }
  if (and.length) where.AND = and;

  // Stable ordering: takenAt (nulls last), then id as tiebreaker so cursoring is deterministic
  let orderBy: Prisma.AssetOrderByWithRelationInput[];
  switch (sort) {
    case 'oldest':
      orderBy = [{ takenAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }];
      break;
    case 'album':
      orderBy = [{ albumId: 'asc' }, { id: 'asc' }];
      break;
    case 'filename':
      orderBy = [{ filename: 'asc' }, { id: 'asc' }];
      break;
    default:
      orderBy = [{ takenAt: { sort: 'desc', nulls: 'last' } }, { id: 'asc' }];
  }

  const useCursor = Boolean(cursor);

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy,
      take: limit,
      ...(useCursor ? { cursor: { id: cursor! }, skip: 1 } : { skip }),
      omit: GUEST_ASSET_OMIT,
      include: { album: { select: { title: true, slug: true } } },
    }),
    prisma.asset.count({ where }),
  ]);

  const nextCursor = items.length === limit ? items[items.length - 1].id : null;
  const hasMore = useCursor ? nextCursor !== null : skip + items.length < total;

  const shaped = items.map((asset) => toClientAsset(attachMediaUrls(asset)));

  return NextResponse.json({
    // Trimmed to the client shape: no internal paths, flags or embeddings.
    items: fold ? await withBursts(shaped) : shaped,
    page,
    limit,
    total,
    hasMore,
    nextCursor,
  });
}
