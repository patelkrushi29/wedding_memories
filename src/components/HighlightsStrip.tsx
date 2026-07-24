'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, ChevronRight } from 'lucide-react';
import { MediaViewerModal } from './MediaViewerModal';
import type { Asset } from '@/types/asset';

interface Props {
  assets: Asset[];
}

/** Horizontal highlights strip; tapping a photo opens the viewer right there. */
export function HighlightsStrip({ assets }: Props) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (assets.length === 0) return null;
  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between px-4 sm:px-0 mb-3">
        <h2 className="font-serif text-xl sm:text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#c9a96e]" />
          Highlights
        </h2>
        <Link href="/highlights" className="text-sm text-[#c9a96e] font-medium flex items-center">
          See all <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="flex gap-1.5 overflow-x-auto px-1.5 sm:px-0 pb-1 snap-x scrollbar-none">
        {assets.map((a, i) => (
          <button
            key={a.id}
            onClick={() => setViewerIndex(i)}
            className="relative shrink-0 w-36 h-52 sm:w-44 sm:h-64 rounded-2xl overflow-hidden snap-start bg-gray-100"
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
    </section>
  );
}
