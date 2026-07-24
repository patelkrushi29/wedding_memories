'use client';

import { useState } from 'react';
import { MediaViewerModal } from './MediaViewerModal';
import type { Asset } from '@/types/asset';

interface Props {
  assets: Asset[];
}

/** Simple tappable grid used by the feed fallback; opens the viewer in place. */
export function RecentGrid({ assets }: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1.5">
        {assets.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setViewerIndex(i)}
            className="relative aspect-square overflow-hidden bg-gray-100 sm:rounded-lg"
            style={
              a.blurDataUrl
                ? { backgroundImage: `url(${a.blurDataUrl})`, backgroundSize: 'cover' }
                : undefined
            }
          >
            <img src={a.thumbnailUrl} alt={a.filename} className="w-full h-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

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
    </>
  );
}
