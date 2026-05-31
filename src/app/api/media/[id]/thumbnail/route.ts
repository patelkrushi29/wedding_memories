import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { r2RedirectUrl } from '@/lib/media/resolve';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    return new NextResponse(placeholder(), { headers: { 'Content-Type': 'image/svg+xml' } });
  }

  const r2Url = r2RedirectUrl(asset.thumbnailPath ?? asset.posterPath);
  if (r2Url) {
    return NextResponse.redirect(r2Url, 302);
  }

  const thumbPath = asset.thumbnailPath
    ? path.join(process.cwd(), 'public', asset.thumbnailPath)
    : null;

  if (thumbPath && fs.existsSync(thumbPath)) {
    const buffer = fs.readFileSync(thumbPath);
    const ext = path.extname(thumbPath).toLowerCase();
    const ct =
      ext === '.webp' ? 'image/webp' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'image/png';
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': ct,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }

  return new NextResponse(placeholder(), { headers: { 'Content-Type': 'image/svg+xml' } });
}

function placeholder() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="#f5f0eb"/>
    <text x="300" y="200" text-anchor="middle" fill="#c9a96e" font-size="48">♥</text>
  </svg>`;
}
