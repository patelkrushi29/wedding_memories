import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { r2RedirectUrl } from '@/lib/media/resolve';
import { isLocalFilesystemPath } from '@/lib/r2/client';
import * as fs from 'fs';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const r2Url = r2RedirectUrl(asset.originalPath);
  if (r2Url) {
    return NextResponse.redirect(r2Url, 302);
  }

  if (!isLocalFilesystemPath(asset.originalPath) || !fs.existsSync(asset.originalPath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(asset.originalPath);
  const mimeType = asset.mimeType || 'application/octet-stream';

  return new NextResponse(fileBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${asset.filename}"`,
      'Content-Length': fileBuffer.length.toString(),
    },
  });
}
