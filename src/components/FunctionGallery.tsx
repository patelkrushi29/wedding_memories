'use client';

import { useRef, useState } from 'react';
import { MediaGrid } from './MediaGrid';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/asset';

interface Props {
  slug: string;
  initialAssets: Asset[];
  /** Count after folding bursts — what the grid will actually page through. */
  initialTotal: number;
  photoCount: number;
  videoCount: number;
}

type Lane = '' | 'PHOTO' | 'VIDEO';

interface LaneData {
  assets: Asset[];
  total: number;
}

/** Function media with photo/video lanes. Video is a filter, never a separate tab. */
export function FunctionGallery({ slug, initialAssets, initialTotal, photoCount, videoCount }: Props) {
  const [lane, setLane] = useState<Lane>('');
  const [loaded, setLoaded] = useState<Partial<Record<Lane, LaneData>>>({
    '': { assets: initialAssets, total: initialTotal },
  });
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState(false);
  const requestRef = useRef(0);

  // Fetch on tap rather than in an effect, and keep each lane once loaded so
  // flipping back and forth is instant.
  const choose = async (next: Lane) => {
    setLane(next);
    setError(false);
    if (loaded[next]) return;
    const req = ++requestRef.current;
    setSwitching(true);
    try {
      const res = await fetch(`/api/assets?function=${slug}&type=${next}&sort=oldest&fold=1&limit=60`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (req !== requestRef.current) return;
      setLoaded((prev) => ({ ...prev, [next]: { assets: data.items, total: data.total } }));
    } catch {
      if (req === requestRef.current) setError(true);
    } finally {
      if (req === requestRef.current) setSwitching(false);
    }
  };

  const current = loaded[lane];
  const query = `function=${slug}&sort=oldest&fold=1${lane ? `&type=${lane}` : ''}`;

  return (
    <>
      {videoCount > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-5 md:px-0 pb-4">
          <button onClick={() => choose('')} className={cn('chip', lane === '' && 'chip-on')}>
            Everything <b>{(photoCount + videoCount).toLocaleString()}</b>
          </button>
          <button onClick={() => choose('PHOTO')} className={cn('chip', lane === 'PHOTO' && 'chip-on')}>
            Photographs <b>{photoCount.toLocaleString()}</b>
          </button>
          <button onClick={() => choose('VIDEO')} className={cn('chip', lane === 'VIDEO' && 'chip-on')}>
            Film <b>{videoCount.toLocaleString()}</b>
          </button>
        </div>
      )}

      {error ? (
        <div className="py-16 text-center">
          <p className="text-sm text-ash">These didn&rsquo;t load.</p>
          <button onClick={() => choose(lane)} className="eyebrow eyebrow-on mt-3">
            Try again
          </button>
        </div>
      ) : current ? (
        <div className={switching ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
          <MediaGrid key={query} initialAssets={current.assets} total={current.total} query={query} />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-[3px] px-[3px] sm:grid-cols-4 sm:gap-2 sm:px-0 lg:grid-cols-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-[4/5] animate-pulse bg-plate sm:rounded-[10px]" />
          ))}
        </div>
      )}
    </>
  );
}
