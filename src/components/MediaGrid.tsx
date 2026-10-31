'use client';

import { useState, useRef, useCallback } from 'react';
import { MediaCard } from './MediaCard';
import { MediaViewerModal } from './MediaViewerModal';
import { InfiniteScrollSentinel } from './InfiniteScrollSentinel';
import type { Asset } from '@/types/asset';

interface Props {
  initialAssets: Asset[];
  total: number;
  /** Query string for /api/assets (without cursor), e.g. "function=sangeet&type=PHOTO" */
  query: string;
  emptyMessage?: string;
}

/**
 * Paginated media grid with an in-place viewer. Owns its own cursor so any
 * surface (function, person, facet result) can reuse it.
 *
 * A new filter should remount it (`key={query}`) rather than reset it in place.
 */
export function MediaGrid({ initialAssets, total, query, emptyMessage }: Props) {
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [loading, setLoading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const cursorRef = useRef<string | null>(initialAssets.at(-1)?.id ?? null);
  const [hasMore, setHasMore] = useState(initialAssets.length < total);
  const [failed, setFailed] = useState(false);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !cursorRef.current) return;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/assets?${query}&limit=60&cursor=${cursorRef.current}`);
      if (res.status === 401) {
        window.location.href = `/auth?next=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setAssets((prev) => {
        const seen = new Set(prev.map((a) => a.id));
        return [...prev, ...data.items.filter((a: Asset) => !seen.has(a.id))];
      });
      cursorRef.current = data.nextCursor ?? null;
      setHasMore(Boolean(data.hasMore) && Boolean(data.nextCursor));
    } catch {
      // Keep hasMore so the sentinel can offer a retry instead of silently ending.
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, query]);

  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  const goTo = (index: number) => {
    setViewerIndex(index);
    if (index >= assets.length - 8) loadMore();
  };

  if (assets.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-ash">
        {emptyMessage || 'Nothing here yet.'}
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 sm:gap-1.5 lg:grid-cols-5">
        {assets.map((asset, index) => (
          <MediaCard key={asset.id} asset={asset} onClick={() => setViewerIndex(index)} />
        ))}
      </div>

      <InfiniteScrollSentinel onLoadMore={loadMore} hasMore={hasMore} loading={loading} failed={failed} />

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
    </>
  );
}
