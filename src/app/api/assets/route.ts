import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const albumSlug = searchParams.get('album');
  const search = searchParams.get('search');
  const sort = searchParams.get('sort') || 'newest';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '60');
  const ids = searchParams.get('ids');
  const skip = (page - 1) * limit;

  const where: Prisma.AssetWhereInput = {
    isHidden: false,
    isAvailable: true,
  };

  if (type) where.type = type.toUpperCase();
  if (search) where.filename = { contains: search };
  if (ids) {
    const idList = ids.split(',').filter(Boolean);
    where.id = { in: idList };
  }

  if (albumSlug) {
    const album = await prisma.album.findUnique({ where: { slug: albumSlug } });
    if (album) where.albumId = album.id;
  }

  let orderBy: Prisma.AssetOrderByWithRelationInput = {};
  switch (sort) {
    case 'oldest':
      orderBy = { takenAt: 'asc' };
      break;
    case 'album':
      orderBy = { albumId: 'asc' };
      break;
    case 'filename':
      orderBy = { filename: 'asc' };
      break;
    default:
      orderBy = { takenAt: 'desc' };
  }

  const [items, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: { album: { select: { title: true, slug: true } } },
    }),
    prisma.asset.count({ where }),
  ]);

  return NextResponse.json({
    items: items.map((a) => ({
      ...a,
      thumbnailUrl: `/api/media/${a.id}/thumbnail`,
      previewUrl: `/api/media/${a.id}/preview`,
      downloadUrl: `/api/media/${a.id}/download`,
    })),
    page,
    limit,
    total,
    hasMore: skip + items.length < total,
  });
}
