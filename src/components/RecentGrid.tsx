'use client';

import { useState } from 'react';
import { MediaCard } from './MediaCard';
import { MediaViewerModal } from './MediaViewerModal';
import type { Asset } from '@/types/asset';

interface Props {
  assets: Asset[];
}

/** Flat grid used before any function has been named. Opens the viewer in place. */
export function RecentGrid({ assets }: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 sm:gap-1.5">
        {assets.map((asset, index) => (
          <MediaCard key={asset.id} asset={asset} onClick={() => setViewerIndex(index)} />
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
