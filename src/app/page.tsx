export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { getFeedSections, getHighlights, getRecentPhotos } from '@/lib/tags/queries';
import { ChevronRight, Sparkles } from 'lucide-react';

function formatRange(startAt: Date | null, endAt: Date | null): string | null {
  if (!startAt) return null;
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const start = fmt.format(startAt);
  if (!endAt || startAt.toDateString() === endAt.toDateString()) return start;
  return `${start} – ${fmt.format(endAt)}`;
}

export default async function FeedPage() {
  const [sections, highlights] = await Promise.all([getFeedSections(7), getHighlights(10)]);
  const recent = sections.length === 0 ? await getRecentPhotos(18) : [];

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <TopNav />
      <main className="max-w-3xl mx-auto px-0 sm:px-6 py-4 sm:py-8">
        {/* Highlights strip */}
        {highlights.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center justify-between px-4 sm:px-0 mb-3">
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#c9a96e]" />
                Highlights
              </h2>
              <Link href="/highlights" className="text-sm text-[#c9a96e] font-medium flex items-center">
                See all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto px-4 sm:px-0 pb-2 snap-x snap-mandatory scrollbar-none">
              {highlights.map((a) => (
                <Link
                  key={a.id}
                  href="/highlights"
                  className="relative shrink-0 w-36 h-48 sm:w-44 sm:h-60 rounded-xl overflow-hidden snap-start bg-gray-100"
                  style={
                    a.blurDataUrl
                      ? { backgroundImage: `url(${a.blurDataUrl})`, backgroundSize: 'cover' }
                      : undefined
                  }
                >
                  <img
                    src={a.thumbnailUrl}
                    alt={a.filename}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Event sections */}
        {sections.map(({ tag, assets }) => {
          const [hero, ...teasers] = assets;
          const range = formatRange(tag.startAt, tag.endAt);
          return (
            <section key={tag.id} className="mb-10">
              <div className="flex items-end justify-between px-4 sm:px-0 mb-3">
                <div>
                  <h2 className="font-serif text-xl sm:text-2xl font-semibold text-gray-800">{tag.name}</h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    {range ? `${range} · ` : ''}
                    {tag.assetCount} photos
                  </p>
                </div>
                <Link
                  href={`/photos?event=${tag.slug}`}
                  className="text-sm text-[#c9a96e] font-medium flex items-center shrink-0"
                >
                  See all <ChevronRight className="h-4 w-4" />
                </Link>
              </div>

              {hero && (
                <Link href={`/photos?event=${tag.slug}`} className="block">
                  <div
                    className="relative w-full aspect-[4/3] sm:rounded-2xl overflow-hidden bg-gray-100"
                    style={
                      hero.blurDataUrl
                        ? { backgroundImage: `url(${hero.blurDataUrl})`, backgroundSize: 'cover' }
                        : undefined
                    }
                  >
                    <img
                      src={hero.thumbnailUrl}
                      alt={hero.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                </Link>
              )}

              {teasers.length > 0 && (
                <div className="grid grid-cols-3 gap-0.5 sm:gap-1.5 mt-0.5 sm:mt-1.5 px-0">
                  {teasers.slice(0, 6).map((a, i) => (
                    <Link
                      key={a.id}
                      href={`/photos?event=${tag.slug}`}
                      className="relative aspect-square overflow-hidden bg-gray-100 sm:rounded-lg"
                      style={
                        a.blurDataUrl
                          ? { backgroundImage: `url(${a.blurDataUrl})`, backgroundSize: 'cover' }
                          : undefined
                      }
                    >
                      <img
                        src={a.thumbnailUrl}
                        alt={a.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {i === 5 && tag.assetCount > 7 && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <span className="text-white font-semibold text-lg">+{tag.assetCount - 7}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* Fallback when no events are named yet */}
        {sections.length === 0 && (
          <section className="px-4 sm:px-0">
            <div className="flex items-end justify-between mb-3">
              <h2 className="font-serif text-xl sm:text-2xl font-semibold text-gray-800">Latest photos</h2>
              <Link href="/photos" className="text-sm text-[#c9a96e] font-medium flex items-center">
                See all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-gray-500 py-16 text-center">No photos yet — check back soon.</p>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 sm:gap-1.5">
                {recent.map((a) => (
                  <Link
                    key={a.id}
                    href="/photos"
                    className="relative aspect-square overflow-hidden bg-gray-100 sm:rounded-lg"
                    style={
                      a.blurDataUrl
                        ? { backgroundImage: `url(${a.blurDataUrl})`, backgroundSize: 'cover' }
                        : undefined
                    }
                  >
                    <img
                      src={a.thumbnailUrl}
                      alt={a.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
