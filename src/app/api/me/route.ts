import { NextRequest, NextResponse } from 'next/server';
import { getPerson, getPersonBest } from '@/lib/people/queries';

/**
 * The people this visitor said are them ("That's me", kept on their device).
 * The server never stores who a visitor is; the device sends the slugs each time.
 */
export async function GET(request: NextRequest) {
  const slugs = (new URL(request.url).searchParams.get('slugs') || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 5);

  const people = (await Promise.all(slugs.map((slug) => getPerson(slug)))).filter((p) => p !== null);
  const result = await Promise.all(
    people.map(async (p) => ({ ...p, best: await getPersonBest(p.id, 12) }))
  );
  return NextResponse.json({ people: result });
}
