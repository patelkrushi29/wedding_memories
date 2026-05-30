'use client';

import { useEffect, useState } from 'react';
import { TopNav } from '@/components/TopNav';
import { MediaCard } from '@/components/MediaCard';
import { MediaViewerModal } from '@/components/MediaViewerModal';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { Heart, Trash2, Download } from 'lucide-react';

const STORAGE_KEY = 'wedding-gallery-selected-assets';

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

export default function SelectedPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const loadSelected = async () => {
    setLoading(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      setAssets([]);
      setLoading(false);
      return;
    }

    const ids: string[] = JSON.parse(stored);
    if (ids.length === 0) {
      setAssets([]);
      setLoading(false);
      return;
    }

    const res = await fetch(`/api/assets?ids=${ids.join(',')}&limit=200`);
    const data = await res.json();
    setAssets(data.items || []);
    setLoading(false);
  };

  useEffect(() => {
    loadSelected();
  }, []);

  const removeAsset = (id: string) => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const ids: string[] = stored ? JSON.parse(stored) : [];
    const updated = ids.filter((i) => i !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setAssets((prev) => prev.filter((a) => a.id !== id));
  };

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAssets([]);
  };

  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl font-semibold text-gray-800 flex items-center gap-3">
              <Heart className="h-8 w-8 text-[#c9a96e] fill-[#c9a96e]" />
              Selected
            </h1>
            <p className="text-gray-500 mt-1">{assets.length} items selected</p>
          </div>

          {assets.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled
                title="Coming soon"
                className="opacity-50 cursor-not-allowed"
              >
                <Download className="h-4 w-4 mr-1" />
                Download as ZIP (coming soon)
              </Button>
              <Button variant="ghost" size="sm" onClick={clearAll} className="text-red-400 hover:text-red-600">
                <Trash2 className="h-4 w-4 mr-1" />
                Clear all
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-gray-400 text-center py-12">Loading...</div>
        ) : assets.length === 0 ? (
          <EmptyState
            message="No selected items"
            description="Click the heart icon on any photo or video to add it to your selection."
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {assets.map((asset, index) => (
              <div key={asset.id} className="relative group">
                <MediaCard asset={asset} onClick={() => setViewerIndex(index)} />
                <button
                  onClick={() => removeAsset(asset.id)}
                  className="absolute top-2 left-2 p-1 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Remove from selected"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
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
