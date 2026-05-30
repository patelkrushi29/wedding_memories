import { NextResponse } from 'next/server';
import { listAlbumsForGallery } from '@/lib/albums/queries';

export async function GET() {
  const result = await listAlbumsForGallery();
  return NextResponse.json(result);
}
