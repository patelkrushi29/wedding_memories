import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { r2RedirectUrl } from '@/lib/media/resolve';

/**
 * Fallback resolver for the viewer tier. Prefers the mid-size render and falls
 * back to the original. Byte-range streaming used to live here for local files;
 * R2 serves ranges itself, which is what long videos need.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { viewerPath: true, originalPath: true },
  });
  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const r2Url = r2RedirectUrl(asset.viewerPath) ?? r2RedirectUrl(asset.originalPath);
  if (!r2Url) {
    return NextResponse.json({ error: 'Media storage is not configured' }, { status: 503 });
  }
  return NextResponse.redirect(r2Url, 307);
}
