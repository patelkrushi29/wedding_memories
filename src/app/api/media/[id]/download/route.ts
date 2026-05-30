import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
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

  if (!fs.existsSync(asset.originalPath)) {
    return NextResponse.json({ error: 'File not found on disk' }, { status: 404 });
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
