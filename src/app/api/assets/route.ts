import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { attachMediaUrls } from '@/lib/storage/assetUrls';
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

  if (tagSlug) {
    where.tags = { some: { tag: { slug: tagSlug, isVisible: true } } };
  }

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
      include: { album: { select: { title: true, slug: true } } },
    }),
    prisma.asset.count({ where }),
  ]);

  const nextCursor = items.length === limit ? items[items.length - 1].id : null;
  const hasMore = useCursor ? nextCursor !== null : skip + items.length < total;

  return NextResponse.json({
    items: items.map((asset) => attachMediaUrls(asset)),
    page,
    limit,
    total,
    hasMore,
    nextCursor,
  });
}
