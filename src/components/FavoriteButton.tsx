'use client';

import { Heart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'wedding-gallery-selected-assets';

export function FavoriteButton({
  assetId,
  className,
  size = 'default',
}: {
  assetId: string;
  className?: string;
  size?: 'default' | 'sm';
}) {
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const ids: string[] = JSON.parse(stored);
      setSelected(ids.includes(assetId));
    }
  }, [assetId]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const stored = localStorage.getItem(STORAGE_KEY);
    const ids: string[] = stored ? JSON.parse(stored) : [];

    let updated: string[];
    if (ids.includes(assetId)) {
      updated = ids.filter((id) => id !== assetId);
    } else {
      updated = [...ids, assetId];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setSelected(updated.includes(assetId));
  };

  return (
    <button
      onClick={toggle}
      className={cn(
        'rounded-full transition-colors',
        size === 'sm' ? 'p-1' : 'p-2',
        selected
          ? 'bg-halide-deep text-halide'
          : 'bg-white/10 text-paper/80 hover:bg-white/20 hover:text-paper',
        className
      )}
      title={selected ? 'Remove from saved' : 'Save'}
      aria-pressed={selected}
    >
      <Heart
        className={cn(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5')}
        fill={selected ? 'currentColor' : 'none'}
        strokeWidth={1.7}
      />
    </button>
  );
}
