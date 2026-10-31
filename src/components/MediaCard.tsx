'use client';

import { Layers } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import type { Asset } from '@/types/asset';

interface MediaCardProps {
  asset: Asset;
  onClick: () => void;
}

/**
 * A bare thumbnail. Saving and sharing live in the viewer, where there's room
 * for them and a thumb can reach them. A folded burst shows how many takes sit
 * behind this one.
 */
export function MediaCard({ asset, onClick }: MediaCardProps) {
  const isVideo = asset.type === 'VIDEO';

  return (
    <button
      onClick={onClick}
      className="group relative block aspect-[4/5] overflow-hidden bg-plate sm:rounded-[10px]"
      style={
        asset.blurDataUrl
          ? { backgroundImage: `url(${asset.blurDataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
          : undefined
      }
      aria-label={isVideo ? 'Play film' : asset.burst ? `Open photo, best of ${asset.burst.size} takes` : 'Open photo'}
    >
      <img
        src={asset.thumbnailUrl}
        alt=""
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        loading="lazy"
      />
      {asset.burst && (
        <span className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/55 px-2 py-0.5 text-[11.5px] font-semibold text-paper backdrop-blur-sm">
          <Layers className="h-3 w-3" strokeWidth={2.2} />
          {asset.burst.size}
        </span>
      )}
      {isVideo && (
        <>
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-[12px] text-paper backdrop-blur-sm">
              ▶
            </span>
          </span>
          {asset.durationSeconds ? (
            <span className="meta absolute bottom-1.5 right-2 text-paper">{formatDuration(asset.durationSeconds)}</span>
          ) : null}
        </>
      )}
    </button>
  );
}
