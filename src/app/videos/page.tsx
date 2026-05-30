'use client';

import { useEffect, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { VideoCard } from '@/components/VideoCard';
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
  durationSeconds?: number | null;
  album?: { title: string; slug: string } | null;
}

export default function VideosPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const fetchAssets = async (pg: number, reset = false) => {
    setLoading(true);
    const res = await fetch(`/api/assets?type=VIDEO&page=${pg}&limit=30`);
    const data = await res.json();
    setAssets((prev) => reset ? data.items : [...prev, ...data.items]);
    setTotal(data.total);
    setHasMore(data.hasMore);
    setLoading(false);
  };

  useEffect(() => {
    fetchAssets(1, true);
  }, []);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchAssets(next);
  };

  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-gray-800">Videos</h1>
          <p className="text-gray-500 mt-1">{total} videos</p>
        </div>

        {loading && assets.length === 0 ? (
          <LoadingGrid count={8} />
        ) : assets.length === 0 ? (
          <EmptyState
            message="No videos yet"
            description="Add video files (.mp4, .mov, .webm) to your media folder and run the import script."
          />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets.map((asset, index) => (
                <VideoCard key={asset.id} asset={asset} onClick={() => setViewerIndex(index)} />
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
