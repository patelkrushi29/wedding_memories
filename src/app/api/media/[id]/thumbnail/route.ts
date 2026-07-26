import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { r2RedirectUrl } from '@/lib/media/resolve';

/**
 * Fallback resolver for the grid tier. Returns a quiet placeholder rather than
 * an error, so one missing render never puts a broken-image icon in a grid.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({
    where: { id },
    select: { thumbnailPath: true, posterPath: true },
  });

  const r2Url = asset
    ? r2RedirectUrl(asset.thumbnailPath) ?? r2RedirectUrl(asset.posterPath)
    : null;
  if (r2Url) {
    return NextResponse.redirect(r2Url, 302);
  }

  return new NextResponse(placeholder(), {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'no-store' },
  });
}

/** Darkroom-toned placeholder: plate background, halide aperture mark. */
function placeholder() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
    <rect width="600" height="600" fill="#1F1815"/>
    <circle cx="300" cy="300" r="46" fill="none" stroke="#2E2622" stroke-width="6"/>
    <circle cx="300" cy="300" r="10" fill="#2E2622"/>
  </svg>`;
}
