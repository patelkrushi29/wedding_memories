export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PersonView } from '@/components/PersonView';
import { getPerson, getPersonBest } from '@/lib/people/queries';
import { prisma } from '@/lib/db';
import { attachMediaUrls } from '@/lib/storage/assetUrls';
import { GUEST_ASSET_OMIT, NOT_FOLDED, toClientAsset, withBursts } from '@/lib/tags/queries';
import { weekdayTime } from '@/lib/time';

export default async function PersonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const person = await getPerson(slug);
  if (!person) notFound();

  const where = { isHidden: false, isAvailable: true, AND: [NOT_FOLDED, { tags: { some: { tagId: person.id } } }] };
  const [best, rows, total] = await Promise.all([
    getPersonBest(person.id, 24),
    prisma.asset.findMany({
      where,
      orderBy: [{ takenAt: { sort: 'asc', nulls: 'last' } }, { id: 'asc' }],
      take: 60,
      omit: GUEST_ASSET_OMIT,
    }),
    prisma.asset.count({ where }),
  ]);
  const all = await withBursts(rows.map((r) => toClientAsset(attachMediaUrls(r))));

  return (
    <AppShell>
      <main>
        <PersonView
          person={person}
          best={best.map((a) => ({ ...a, sub: weekdayTime(a.takenAt) ?? undefined }))}
          initialAssets={all}
          initialTotal={total}
        />
      </main>
    </AppShell>
  );
}
