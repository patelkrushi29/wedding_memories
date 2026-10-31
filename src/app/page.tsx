export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/AppShell';
import { HomeExperience, type HomeFunction } from '@/components/HomeExperience';
import { RecentGrid } from '@/components/RecentGrid';
import { getDaysWithFunctions, getFunctionHighlights, getGalleryTotals, getRecentAssets } from '@/lib/tags/queries';
import { getSiteConfig } from '@/lib/settings';
import { dayPart, weekdayTime } from '@/lib/time';

function statsLine(t: { days: number; functions: number; total: number }): string {
  const parts: string[] = [];
  if (t.days) parts.push(`${t.days} ${t.days === 1 ? 'day' : 'days'}`);
  if (t.functions) parts.push(`${t.functions} ${t.functions === 1 ? 'event' : 'events'}`);
  parts.push(`${t.total.toLocaleString()} photos`);
  return parts.join(' · ');
}

export default async function HomePage() {
  const [days, totals, { coupleNames }] = await Promise.all([
    getDaysWithFunctions(),
    getGalleryTotals(),
    getSiteConfig(),
  ]);

  if (days.length === 0) {
    const recent = await getRecentAssets(24);
    return (
      <AppShell subtitle={statsLine(totals)}>
        <main className="mx-auto max-w-3xl px-5 pt-8 sm:px-8">
          <h1 className="display text-[40px]">{coupleNames}</h1>
          <div className="meta mt-2">{statsLine(totals)}</div>
          <div className="mt-8">
            {recent.length === 0 ? (
              <p className="py-20 text-center text-sm text-ash">Nothing here yet. Photographs appear as they are added.</p>
            ) : (
              <>
                <RecentGrid assets={recent} />
                <p className="meta mt-6 text-center">Highlights appear once the events are named.</p>
              </>
            )}
          </div>
        </main>
      </AppShell>
    );
  }

  const functions: HomeFunction[] = await Promise.all(
    days.flatMap((day) =>
      day.functions.map(async (fn) => {
        const weekday = day.name.split(' ')[0];
        const highlights = (await getFunctionHighlights(fn.id, 8)).map((a) => ({
          ...a,
          title: fn.name,
          sub: [weekday, weekdayTime(a.takenAt)].filter(Boolean).join(' · '),
        }));
        return {
          slug: fn.slug,
          name: fn.name,
          dayLabel: [weekday, dayPart(fn.startAt)].filter(Boolean).join(' · '),
          assetCount: fn.assetCount,
          coverThumbnailUrl: highlights[0]?.thumbnailUrl ?? fn.coverThumbnailUrl,
          highlights,
        };
      })
    )
  );

  // Cover: the middle highlight of the biggest event — usually the wedding itself.
  const biggest = [...functions].sort((a, b) => b.assetCount - a.assetCount)[0];
  const cover = biggest?.highlights[Math.floor(biggest.highlights.length / 2)] ?? null;

  return (
    <AppShell subtitle={statsLine(totals)}>
      <main>
        <HomeExperience coupleNames={coupleNames} statsLine={statsLine(totals)} cover={cover} functions={functions} />
      </main>
    </AppShell>
  );
}
