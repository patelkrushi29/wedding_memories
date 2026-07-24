'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { MediaCard } from '@/components/MediaCard';
import { MediaViewerModal } from '@/components/MediaViewerModal';
import { FilterBar } from '@/components/FilterBar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingGrid } from '@/components/LoadingGrid';
import { InfiniteScrollSentinel } from '@/components/InfiniteScrollSentinel';
import { EventChips } from '@/components/EventChips';
import type { Asset } from '@/types/asset';

interface Album {
  slug: string;
  title: string;
}

function PhotosPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [assets, setAssets] = useState<Asset[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  // Event filter comes from the URL (?event=slug) so filtered views are shareable
  const eventSlug = searchParams.get('event') || '';
  const album = searchParams.get('album') || '';

  const cursorRef = useRef<string | null>(null);

  useEffect(() => {
    fetch('/api/albums').then((r) => r.json()).then(setAlbums).catch(() => {});
  }, []);

  const fetchAssets = useCallback(
    async (reset = false) => {
      setLoading(true);
      const params = new URLSearchParams({ type: 'PHOTO', limit: '60', sort });
      if (search) params.set('search', search);
      if (album) params.set('album', album);
      if (eventSlug) params.set('event', eventSlug);
      if (!reset && cursorRef.current) params.set('cursor', cursorRef.current);

      try {
        const res = await fetch(`/api/assets?${params}`);
        const data = await res.json();
        setAssets((prev) => (reset ? data.items : [...prev, ...data.items]));
        setTotal(data.total);
        setHasMore(data.hasMore);
        cursorRef.current = data.nextCursor ?? null;
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [search, album, sort, eventSlug]
  );

  useEffect(() => {
    cursorRef.current = null;
    fetchAssets(true);
  }, [fetchAssets]);

  const setAlbumFilter = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set('album', slug);
    else params.delete('album');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const setEventFilter = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set('event', slug);
    else params.delete('event');
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <TopNav />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="font-serif text-2xl sm:text-4xl font-semibold text-gray-800">Photos</h1>
        </div>

        <EventChips selected={eventSlug} onSelect={setEventFilter} />

        <FilterBar
          search={search}
          onSearch={setSearch}
          album={album}
          onAlbum={setAlbumFilter}
          sort={sort}
          onSort={setSort}
          albums={albums}
          total={total}
          showing={assets.length}
        />

        {loading && assets.length === 0 ? (
          <LoadingGrid count={20} />
        ) : assets.length === 0 ? (
          <EmptyState message="No photos found" description="Try adjusting your filters." />
        ) : (
          <>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-3">
              {assets.map((asset, index) => (
                <MediaCard key={asset.id} asset={asset} onClick={() => setViewerIndex(index)} />
              ))}
            </div>
            <InfiniteScrollSentinel onLoadMore={() => fetchAssets(false)} hasMore={hasMore} loading={loading} />
          </>
        )}
      </main>

      {currentAsset && (
        <MediaViewerModal
          asset={currentAsset}
          onClose={() => setViewerIndex(null)}
          onPrev={viewerIndex! > 0 ? () => setViewerIndex(viewerIndex! - 1) : undefined}
          onNext={viewerIndex! < assets.length - 1 ? () => setViewerIndex(viewerIndex! + 1) : undefined}
          hasPrev={viewerIndex! > 0}
          hasNext={viewerIndex! < assets.length - 1}
          prevAsset={viewerIndex! > 0 ? assets[viewerIndex! - 1] : null}
          nextAsset={viewerIndex! < assets.length - 1 ? assets[viewerIndex! + 1] : null}
        />
      )}
    </div>
  );
}

export default function PhotosPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#faf9f6]" />}>
      <PhotosPageInner />
    </Suspense>
  );
}
