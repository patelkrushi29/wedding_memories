'use client';

import { useEffect, useState, useCallback } from 'react';
import { TopNav } from '@/components/TopNav';
import { MediaCard } from '@/components/MediaCard';
import { MediaViewerModal } from '@/components/MediaViewerModal';
import { EmptyState } from '@/components/EmptyState';
import { LoadingGrid } from '@/components/LoadingGrid';

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

export default function HighlightsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/assets?album=highlights&limit=100&sort=newest')
      .then((r) => r.json())
      .then((data) => {
        // fallback: if no highlights album, get first 100 photos
        if (data.items?.length === 0) {
          return fetch('/api/assets?type=photo&limit=100&sort=newest').then((r) => r.json());
        }
        return data;
      })
      .then((data) => {
        setAssets(data.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const openViewer = (index: number) => setViewerIndex(index);
  const closeViewer = () => setViewerIndex(null);

  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-gray-800">Highlights</h1>
          <p className="text-gray-500 mt-1">The most beautiful moments from your special day</p>
        </div>

        {loading ? (
          <LoadingGrid count={20} />
        ) : assets.length === 0 ? (
          <EmptyState
            message="No highlights yet"
            description="Add photos to a 'highlights' folder in your media directory and run the import script."
          />
        ) : (
          <div className="masonry-grid">
            {assets.map((asset, index) => (
              <div key={asset.id} className="masonry-item">
                <div
                  className="group relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={() => openViewer(index)}
                >
                  <img
                    src={asset.thumbnailUrl}
                    alt={asset.filename}
                    className="w-full block transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {currentAsset && (
        <MediaViewerModal
          asset={currentAsset}
          onClose={closeViewer}
          onPrev={viewerIndex! > 0 ? () => setViewerIndex(viewerIndex! - 1) : undefined}
          onNext={viewerIndex! < assets.length - 1 ? () => setViewerIndex(viewerIndex! + 1) : undefined}
          hasPrev={viewerIndex! > 0}
          hasNext={viewerIndex! < assets.length - 1}
        />
      )}
    </div>
  );
}
