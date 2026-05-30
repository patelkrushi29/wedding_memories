'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { MediaCard } from '@/components/MediaCard';
import { MediaViewerModal } from '@/components/MediaViewerModal';
import { EmptyState } from '@/components/EmptyState';
import { LoadingGrid } from '@/components/LoadingGrid';
import { Button } from '@/components/ui/button';

interface Asset {
  id: string;
  type: string;
  filename: string;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  fileSizeBytes: number;
  width?: number | null;
  height?: number | null;
  album?: { title: string; slug: string } | null;
}

interface Album {
  id: string;
  title: string;
  slug: string;
}

export default function AlbumDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [album, setAlbum] = useState<Album | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const fetchData = async (pg: number, reset = false) => {
    setLoading(true);
    const res = await fetch(`/api/albums/${slug}?page=${pg}&limit=60`);
    const data = await res.json();
    setAlbum(data.album);
    setAssets((prev) => reset ? data.assets : [...prev, ...data.assets]);
    setHasMore(data.hasMore);
    setTotal(data.total);
    setLoading(false);
  };

  useEffect(() => {
    if (slug) fetchData(1, true);
  }, [slug]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchData(next);
  };

  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-gray-800">
            {album?.title || slug}
          </h1>
          <p className="text-gray-500 mt-1">{total} items</p>
        </div>

        {loading && assets.length === 0 ? (
          <LoadingGrid count={20} />
        ) : assets.length === 0 ? (
          <EmptyState message="No items in this album" />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {assets.map((asset, index) => (
                <MediaCard key={asset.id} asset={asset} onClick={() => setViewerIndex(index)} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button onClick={loadMore} disabled={loading} variant="outline">
                  {loading ? 'Loading...' : 'Load more'}
                </Button>
              </div>
            )}
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
        />
      )}
    </div>
  );
}
