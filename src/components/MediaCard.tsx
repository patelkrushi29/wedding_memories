'use client';

import { formatDuration } from '@/lib/utils';
import type { Asset } from '@/types/asset';

interface MediaCardProps {
  asset: Asset;
  onClick: () => void;
}

/**
 * A bare thumbnail. No hover chrome by design — saving and downloading live in
 * the viewer, where there's room for them and a thumb can reach them.
 */
export function MediaCard({ asset, onClick }: MediaCardProps) {
  const isVideo = asset.type === 'VIDEO';

  return (
    <button
      onClick={onClick}
      className="group relative block aspect-square overflow-hidden bg-plate sm:rounded-[6px]"
      style={
        asset.blurDataUrl
          ? {
              backgroundImage: `url(${asset.blurDataUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      <img
        src={asset.thumbnailUrl}
        alt=""
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        loading="lazy"
      />
      {isVideo && (
        <>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-paper/60 bg-black/25 text-[11px] text-paper backdrop-blur-sm">
              ▶
            </span>
          </div>
          {asset.durationSeconds ? (
            <span className="numeral absolute bottom-1 right-1.5 text-paper">
              {formatDuration(asset.durationSeconds)}
            </span>
          ) : null}
        </>
      )}
    </button>
  );
}
