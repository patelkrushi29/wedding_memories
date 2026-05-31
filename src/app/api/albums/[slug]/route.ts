import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { attachMediaUrls } from '@/lib/storage/assetUrls';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '60');
  const skip = (page - 1) * limit;

  const album = await prisma.album.findUnique({
    where: { slug },
  });

  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 });
  }

  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where: { albumId: album.id, isHidden: false, isAvailable: true },
      orderBy: { takenAt: 'asc' },
      skip,
      take: limit,
    }),
    prisma.asset.count({
      where: { albumId: album.id, isHidden: false, isAvailable: true },
    }),
  ]);

  return NextResponse.json({
    album,
    assets: assets.map((asset) => attachMediaUrls(asset)),
    page,
    limit,
    total,
    hasMore: skip + assets.length < total,
  });
}
