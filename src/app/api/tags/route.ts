import { NextRequest, NextResponse } from 'next/server';
import { listEventTags } from '@/lib/tags/queries';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get('kind') || 'EVENT').toUpperCase();

  if (kind !== 'EVENT') {
    return NextResponse.json({ error: 'Only kind=EVENT is supported for now' }, { status: 400 });
  }

  const tags = await listEventTags();
  return NextResponse.json(tags.filter((t) => t.assetCount > 0));
}
