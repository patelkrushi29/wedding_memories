export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { FunctionView } from '@/components/FunctionView';
import { getFunctionAssets, getFunctionBySlug, getFunctionHighlights } from '@/lib/tags/queries';
import { dayPart, weekdayTime } from '@/lib/time';

export default async function FunctionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fn = await getFunctionBySlug(slug);
  if (!fn) notFound();

  const [page, highlights] = await Promise.all([getFunctionAssets(fn.id, 60), getFunctionHighlights(fn.id, 12)]);
  const weekday = fn.dayName?.split(' ')[0] ?? null;

  return (
    <AppShell>
      <main>
        <FunctionView
          fn={{
            slug: fn.slug,
            name: fn.name,
            eyebrow: [weekday, dayPart(fn.startAt)].filter(Boolean).join(' · '),
            photoCount: fn.photoCount,
            videoCount: fn.videoCount,
          }}
          highlights={highlights.map((a) => ({
            ...a,
            title: fn.name,
            sub: [weekday, weekdayTime(a.takenAt)].filter(Boolean).join(' · '),
          }))}
          initialAssets={page.items}
          initialTotal={page.total}
        />
      </main>
    </AppShell>
  );
}
