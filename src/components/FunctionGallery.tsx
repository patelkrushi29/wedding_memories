'use client';

import { useState, useEffect } from 'react';
import { MediaGrid } from './MediaGrid';
import { cn } from '@/lib/utils';
import type { Asset } from '@/types/asset';

interface Props {
  slug: string;
  initialAssets: Asset[];
  photoCount: number;
  videoCount: number;
}

type Lane = '' | 'PHOTO' | 'VIDEO';

/** Function media with photo/video lanes. Video is a filter, never a separate tab. */
export function FunctionGallery({ slug, initialAssets, photoCount, videoCount }: Props) {
  const [lane, setLane] = useState<Lane>('');
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [total, setTotal] = useState(photoCount + videoCount);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (lane === '') {
      setAssets(initialAssets);
      setTotal(photoCount + videoCount);
      return;
    }
    let live = true;
    setSwitching(true);
    fetch(`/api/assets?function=${slug}&type=${lane}&sort=oldest&limit=60`)
      .then((r) => r.json())
      .then((data) => {
        if (!live) return;
        setAssets(data.items);
        setTotal(data.total);
      })
      .finally(() => live && setSwitching(false));
    return () => {
      live = false;
    };
  }, [lane, slug, initialAssets, photoCount, videoCount]);

  const query = `function=${slug}&sort=oldest${lane ? `&type=${lane}` : ''}`;

  return (
    <>
      {videoCount > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-none px-5 sm:px-0 pb-4">
          <button onClick={() => setLane('')} className={cn('chip', lane === '' && 'chip-on')}>
            Everything <b>{(photoCount + videoCount).toLocaleString()}</b>
          </button>
          <button onClick={() => setLane('PHOTO')} className={cn('chip', lane === 'PHOTO' && 'chip-on')}>
            Photographs <b>{photoCount.toLocaleString()}</b>
          </button>
          <button onClick={() => setLane('VIDEO')} className={cn('chip', lane === 'VIDEO' && 'chip-on')}>
            Film <b>{videoCount.toLocaleString()}</b>
          </button>
        </div>
      )}

      <div className={switching ? 'opacity-40 transition-opacity' : 'transition-opacity'}>
        <MediaGrid initialAssets={assets} total={total} query={query} />
      </div>
    </>
  );
}
