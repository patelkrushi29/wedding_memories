'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { MediaViewerModal } from './MediaViewerModal';
import type { Asset } from '@/types/asset';

interface FeedTag {
  id: string;
  name: string;
  slug: string;
  assetCount: number;
  startAt: string | null;
  endAt: string | null;
}

interface Props {
  tag: FeedTag;
  initialAssets: Asset[];
}

function formatRange(startAt: string | null, endAt: string | null): string | null {
  if (!startAt) return null;
  const start = new Date(startAt);
  const fmt = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const s = fmt.format(start);
  if (!endAt || start.toDateString() === new Date(endAt).toDateString()) return s;
  return `${s} – ${fmt.format(new Date(endAt))}`;
}

/**
 * One immersive event section in the feed: full-bleed hero with overlaid title,
 * a horizontal teaser strip, and an inline full-screen viewer that can swipe
 * through the ENTIRE event (progressively loaded).
 */
export function FeedSection({ tag, initialAssets }: Props) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(tag.assetCount > initialAssets.length);
  const loadingRef = useRef(false);
  const fullListLoaded = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    try {
      const params = new URLSearchParams({ event: tag.slug, sort: 'oldest', limit: '100' });
      if (cursorRef.current) params.set('cursor', cursorRef.current);
      const res = await fetch(`/api/assets?${params}`);
      const data = await res.json();

      setAssets((prev) => {
        if (!fullListLoaded.current) {
          // First full fetch replaces the teasers (same oldest-first ordering)
          fullListLoaded.current = true;
          return data.items;
        }
        const seen = new Set(prev.map((a: Asset) => a.id));
        return [...prev, ...data.items.filter((a: Asset) => !seen.has(a.id))];
      });
      cursorRef.current = data.nextCursor ?? null;
      hasMoreRef.current = Boolean(data.hasMore);
    } finally {
      loadingRef.current = false;
    }
  }, [tag.slug]);

  const openViewer = (asset: Asset, indexInCurrent: number) => {
    setViewerIndex(indexInCurrent);
    // Pull the full event list so swiping continues past the teasers
    if (!fullListLoaded.current && tag.assetCount > initialAssets.length) {
      loadMore().then(() => {
        setAssets((current) => {
          const realIndex = current.findIndex((a) => a.id === asset.id);
          if (realIndex >= 0) setViewerIndex(realIndex);
          return current;
        });
      });
    }
  };

  const goTo = (index: number) => {
    setViewerIndex(index);
    // Stream in the next page when the user swipes close to the end
    if (index >= assets.length - 8) loadMore();
  };

  const [hero, ...teasers] = assets.slice(0, 13);
  const range = formatRange(tag.startAt, tag.endAt);
  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  if (!hero) return null;

  return (
    <section className="mb-8 sm:mb-12">
      {/* Immersive hero — title lives on the image */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => openViewer(hero, 0)}
        onKeyDown={(e) => e.key === 'Enter' && openViewer(hero, 0)}
        className="relative block w-full text-left aspect-[4/5] sm:aspect-[16/9] sm:rounded-3xl overflow-hidden bg-gray-200 cursor-pointer"
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-black/25" />
        <div className="absolute bottom-0 inset-x-0 p-5 sm:p-7">
          <h2 className="font-serif text-3xl sm:text-4xl font-semibold text-white drop-shadow-sm">
            {tag.name}
          </h2>
          <p className="text-white/85 text-sm sm:text-base mt-1">
            {range ? `${range} · ` : ''}
            {tag.assetCount} photos
          </p>
        </div>
        <Link
          href={`/photos?event=${tag.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-4 right-4 flex items-center gap-0.5 px-3.5 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-medium border border-white/25"
        >
          View all <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Horizontal teaser strip */}
      {teasers.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-1.5 sm:px-0 mt-1.5 snap-x">
          {teasers.map((a, i) => (
            <div
              key={a.id}
              role="button"
              tabIndex={0}
              onClick={() => openViewer(a, i + 1)}
              onKeyDown={(e) => e.key === 'Enter' && openViewer(a, i + 1)}
              className="relative shrink-0 w-28 h-40 sm:w-36 sm:h-52 rounded-xl overflow-hidden snap-start bg-gray-100 cursor-pointer"
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
              {i === teasers.length - 1 && tag.assetCount > 13 && (
                <Link
                  href={`/photos?event=${tag.slug}`}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center text-white"
                >
                  <span className="font-semibold text-lg">+{tag.assetCount - 13}</span>
                  <span className="text-xs text-white/80">more</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {currentAsset && (
        <MediaViewerModal
          asset={currentAsset}
          onClose={() => setViewerIndex(null)}
          onPrev={viewerIndex! > 0 ? () => goTo(viewerIndex! - 1) : undefined}
          onNext={viewerIndex! < assets.length - 1 ? () => goTo(viewerIndex! + 1) : undefined}
          hasPrev={viewerIndex! > 0}
          hasNext={viewerIndex! < assets.length - 1}
          prevAsset={viewerIndex! > 0 ? assets[viewerIndex! - 1] : null}
          nextAsset={viewerIndex! < assets.length - 1 ? assets[viewerIndex! + 1] : null}
        />
      )}
    </section>
  );
}
