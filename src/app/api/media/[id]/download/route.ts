import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { r2RedirectUrl } from '@/lib/media/resolve';

/**
 * Fallback resolver: asset id → R2 URL. The UI normally links straight to R2,
 * so this only runs when R2_PUBLIC_BASE_URL is unset or a stored key is odd.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { originalPath: true },
  });
  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const r2Url = r2RedirectUrl(asset.originalPath);
  if (!r2Url) {
    return NextResponse.json({ error: 'Media storage is not configured' }, { status: 503 });
  }
  return NextResponse.redirect(r2Url, 302);
}
