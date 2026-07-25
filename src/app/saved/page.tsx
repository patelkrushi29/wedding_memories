'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Trash2 } from 'lucide-react';
import { BottomTabs } from '@/components/BottomTabs';
import { MediaCard } from '@/components/MediaCard';
import { MediaViewerModal } from '@/components/MediaViewerModal';
import type { Asset } from '@/types/asset';

const STORAGE_KEY = 'wedding-gallery-selected-assets';

export default function SavedPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const stored = localStorage.getItem(STORAGE_KEY);
    const ids: string[] = stored ? JSON.parse(stored) : [];
    if (ids.length === 0) {
      setAssets([]);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/assets?ids=${ids.join(',')}&limit=200`);
      const data = await res.json();
      setAssets(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const clearAll = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAssets([]);
  };

  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  return (
    <div className="min-h-screen bg-ink">
      <main className="max-w-5xl mx-auto px-5 sm:px-8 pt-4 sm:pt-10">
        <header className="flex items-start justify-between pb-6">
          <div>
            <h1 className="display flex items-center gap-2.5 text-[27px] sm:text-[34px]">
              <Heart className="h-6 w-6 text-halide" fill="currentColor" />
              Saved
            </h1>
            <div className="mono mt-2">
              {assets.length} {assets.length === 1 ? 'photograph' : 'photographs'} · only on this
              device
            </div>
          </div>
          {assets.length > 0 && (
            <button onClick={clearAll} className="mono flex items-center gap-1.5 pt-2 hover:text-paper">
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </header>

        {loading ? (
          <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 sm:gap-1.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse bg-plate sm:rounded-[6px]" />
            ))}
          </div>
        ) : assets.length === 0 ? (
          <div className="rounded-panel border border-veil bg-plate p-6">
            <p className="text-[15px] text-paper">Nothing saved yet.</p>
            <p className="mt-2 text-sm leading-relaxed text-ash">
              Tap the heart on any photograph and it lands here. Saves stay on your device — nobody
              else can see them.
            </p>
            <Link href="/" className="mono mono-on mt-4 inline-block">
              Browse the days →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 sm:gap-1.5 lg:grid-cols-5">
            {assets.map((asset, index) => (
              <MediaCard key={asset.id} asset={asset} onClick={() => setViewerIndex(index)} />
            ))}
          </div>
        )}
      </main>

      <BottomTabs />

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
