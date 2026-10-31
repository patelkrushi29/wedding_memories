'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Heart, Trash2 } from 'lucide-react';
import { MediaCard } from './MediaCard';
import { MediaViewerModal } from './MediaViewerModal';
import { clearSaved, removeSaved, useSavedIds } from '@/lib/savedStore';
import type { Asset } from '@/types/asset';

interface Fetched {
  key: string;
  assets: Asset[];
  failed: boolean;
}

/** The visitor's private saves. Reads ids from this device, details from the API. */
export function SavedGallery() {
  const ids = useSavedIds();
  const [fetched, setFetched] = useState<Fetched | null>(null);
  // Only refetch when an id appears that we haven't asked for; un-saving filters locally.
  const requested = useMemo(() => new Set(fetched?.key.split(',') ?? []), [fetched]);
  const needsFetch = ids.some((id) => !requested.has(id));
  const key = needsFetch ? ids.join(',') : (fetched?.key ?? '');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!key) return;
    let live = true;
    fetch(`/api/assets?ids=${key}&limit=200`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        if (!live) return;
        const items: Asset[] = data.items || [];
        // Keep save order (newest save first), and forget ids that no longer exist.
        const byId = new Map(items.map((a) => [a.id, a]));
        const ordered = key
          .split(',')
          .reverse()
          .map((id) => byId.get(id))
          .filter((a): a is Asset => Boolean(a));
        const gone = key.split(',').filter((id) => !byId.has(id));
        if (gone.length) removeSaved(gone);
        setFetched({ key, assets: ordered, failed: false });
      })
      .catch(() => live && setFetched({ key, assets: [], failed: true }));
    return () => {
      live = false;
    };
  }, [key, retry]);

  // Removing a save shouldn't refetch: filter what we have.
  const assets = useMemo(() => {
    if (!fetched) return [];
    const keep = new Set(ids);
    return fetched.assets.filter((a) => keep.has(a.id));
  }, [fetched, ids]);

  const loading = ids.length > 0 && needsFetch && !fetched?.failed;
  const failed = ids.length > 0 && Boolean(fetched?.failed);
  const currentAsset = viewerIndex !== null ? assets[viewerIndex] : null;

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-8 pt-4 sm:pt-10 pb-28">
      <header className="flex items-start justify-between pb-6">
        <div>
          <h1 className="display flex items-center gap-2.5 text-[27px] sm:text-[34px]">
            <Heart className="h-6 w-6 text-halide" fill="currentColor" />
            Saved
          </h1>
          <div className="mono mt-2">
            {ids.length} {ids.length === 1 ? 'photograph' : 'photographs'} · only on this device
          </div>
        </div>
        {ids.length > 0 && (
          <button onClick={clearSaved} className="mono flex items-center gap-1.5 pt-2 hover:text-paper">
            <Trash2 className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </header>

      {failed ? (
        <div className="py-16 text-center">
          <p className="text-sm text-ash">Your saves didn&rsquo;t load.</p>
          <button onClick={() => setRetry((n) => n + 1)} className="mono mono-on mt-3">
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-4 sm:gap-1.5">
          {Array.from({ length: Math.min(ids.length, 12) || 9 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse bg-plate sm:rounded-[6px]" />
          ))}
        </div>
      ) : ids.length === 0 ? (
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
    </main>
  );
}
