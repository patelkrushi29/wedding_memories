export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/AppShell';
import { DaysBrowser } from '@/components/DaysBrowser';
import { PullToRefresh } from '@/components/PullToRefresh';
import { RecentGrid } from '@/components/RecentGrid';
import { getDaysWithFunctions, getGalleryTotals, getRecentAssets } from '@/lib/tags/queries';
import { getSiteConfig } from '@/lib/settings';

function totalsLine(t: { days: number; functions: number; total: number }): string {
  const parts: string[] = [];
  if (t.days) parts.push(`${t.days} ${t.days === 1 ? 'day' : 'days'}`);
  if (t.functions) parts.push(`${t.functions} ${t.functions === 1 ? 'function' : 'functions'}`);
  parts.push(t.total.toLocaleString());
  return parts.join(' · ');
}

export default async function DaysPage() {
  const [days, totals, { coupleNames }] = await Promise.all([
    getDaysWithFunctions(),
    getGalleryTotals(),
    getSiteConfig(),
  ]);
  const recent = days.length === 0 ? await getRecentAssets(24) : [];

  return (
    <AppShell subtitle={totalsLine(totals)}>
      <main className="max-w-3xl mx-auto sm:px-8 pt-4 sm:pt-10">
        <PullToRefresh>
          <header className="px-5 sm:px-0 pb-6 md:hidden">
            <h1 className="display text-[26px]">{coupleNames}</h1>
            <div className="mono mt-2">{totalsLine(totals)}</div>
          </header>

          {days.length > 0 ? (
            <DaysBrowser days={days} />
          ) : (
            <section className="px-5 sm:px-0">
              <div className="mono mb-3">Everything so far</div>
              {recent.length === 0 ? (
                <p className="text-ash py-20 text-center text-sm">
                  Nothing here yet. Photographs appear as they are added.
                </p>
              ) : (
                <>
                  <RecentGrid assets={recent} />
                  <p className="mono mt-6 text-center leading-relaxed">
                    Days and functions appear
                    <br />
                    once they are named
                  </p>
                </>
              )}
            </section>
          )}
        </PullToRefresh>
      </main>
    </AppShell>
  );
}
