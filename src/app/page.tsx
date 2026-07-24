export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { FeedSection } from '@/components/FeedSection';
import { HighlightsStrip } from '@/components/HighlightsStrip';
import { RecentGrid } from '@/components/RecentGrid';
import { PullToRefresh } from '@/components/PullToRefresh';
import { getFeedSections, getHighlights, getRecentPhotos } from '@/lib/tags/queries';
import { ChevronRight } from 'lucide-react';

export default async function FeedPage() {
  const [sections, highlights] = await Promise.all([getFeedSections(13), getHighlights(10)]);
  const recent = sections.length === 0 ? await getRecentPhotos(18) : [];

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <TopNav />
      <main className="max-w-3xl mx-auto px-0 sm:px-6 py-3 sm:py-8">
        <PullToRefresh>
        <HighlightsStrip assets={JSON.parse(JSON.stringify(highlights))} />

        {sections.map(({ tag, assets }) => (
          <FeedSection
            key={tag.id}
            tag={{
              id: tag.id,
              name: tag.name,
              slug: tag.slug,
              assetCount: tag.assetCount,
              startAt: tag.startAt ? tag.startAt.toISOString() : null,
              endAt: tag.endAt ? tag.endAt.toISOString() : null,
            }}
            initialAssets={JSON.parse(JSON.stringify(assets))}
          />
        ))}

        {/* Fallback when no events are named yet */}
        {sections.length === 0 && (
          <section className="px-0 sm:px-0">
            <div className="flex items-end justify-between mb-3 px-4 sm:px-0">
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-gray-800">Latest photos</h2>
              <Link href="/photos" className="text-sm text-[#c9a96e] font-medium flex items-center">
                See all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-gray-500 py-16 text-center">No photos yet — check back soon.</p>
            ) : (
              <RecentGrid assets={JSON.parse(JSON.stringify(recent))} />
            )}
          </section>
        )}
        </PullToRefresh>
      </main>
    </div>
  );
}
