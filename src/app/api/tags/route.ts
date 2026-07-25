import { NextRequest, NextResponse } from 'next/server';
import { listFunctions } from '@/lib/tags/queries';

/** Published functions, for chips and facet lists. */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get('kind') || 'FUNCTION').toUpperCase();

  if (kind !== 'FUNCTION' && kind !== 'EVENT') {
    return NextResponse.json({ error: 'Only kind=FUNCTION is supported' }, { status: 400 });
  }

  return NextResponse.json(await listFunctions());
}
