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
        'rounded-full transition-all duration-200',
        size === 'sm' ? 'p-1' : 'p-2',
        selected
          ? 'text-red-500 bg-red-50 hover:bg-red-100'
          : 'text-white/80 hover:text-red-400 bg-black/20 hover:bg-black/30',
        className
      )}
      title={selected ? 'Remove from selected' : 'Add to selected'}
    >
      <Heart
        className={cn(size === 'sm' ? 'h-4 w-4' : 'h-5 w-5', selected && 'fill-current')}
      />
    </button>
  );
}
