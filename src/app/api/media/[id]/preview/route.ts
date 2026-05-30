import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as fs from 'fs';

export async function GET(
  request: NextRequest,
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

  const stat = fs.statSync(asset.originalPath);
  const mimeType = asset.mimeType || 'application/octet-stream';
  const rangeHeader = request.headers.get('range');

  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    const stream = fs.createReadStream(asset.originalPath, { start, end });
    const body = await streamToBuffer(stream);

    return new NextResponse(body as unknown as BodyInit, {
      status: 206,
      headers: {
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize.toString(),
        'Content-Type': mimeType,
      },
    });
  }

  const fileBuffer = fs.readFileSync(asset.originalPath);
  return new NextResponse(fileBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
