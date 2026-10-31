'use client';

import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleSaved, useIsSaved } from '@/lib/savedStore';

interface Props {
  assetId: string;
  className?: string;
  size?: 'default' | 'sm';
}

/** The private save marker. No counts, no server record — see savedStore. */
export function FavoriteButton({ assetId, className, size = 'default' }: Props) {
  const selected = useIsSaved(assetId);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toggleSaved(assetId);
      }}
      className={cn(
        'rounded-full transition-colors',
        size === 'sm' ? 'p-1' : 'p-2',
        selected
          ? 'bg-accent-deep text-accent'
          : 'bg-white/10 text-paper/80 hover:bg-white/20 hover:text-paper',
        className
      )}
      title={selected ? 'Remove from saved' : 'Save'}
      aria-label={selected ? 'Remove from saved' : 'Save'}
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
