'use client';

import { useState } from 'react';
import { Check, SquarePlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { POST_LIMIT, toggleInPost, usePostBasket } from '@/lib/postBasket';

interface Props {
  assetId: string;
  className?: string;
  /** Icon only, for tight rows. */
  compact?: boolean;
}

/** Add or remove a photo from the post being composed. */
export function AddToPostButton({ assetId, className, compact }: Props) {
  const basket = usePostBasket();
  const inPost = basket.includes(assetId);
  const [full, setFull] = useState(false);

  const label = full ? `Post is full (${POST_LIMIT})` : inPost ? `In post · ${basket.length}` : 'Add to post';

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        const ok = toggleInPost(assetId);
        setFull(!ok);
        if (!ok) setTimeout(() => setFull(false), 1800);
      }}
      aria-pressed={inPost}
      aria-label={compact ? label : undefined}
      className={cn(
        'btn whitespace-nowrap',
        inPost ? 'border border-accent bg-accent-deep text-accent' : 'btn-ghost',
        compact && 'w-[52px] px-0',
        className
      )}
    >
      {inPost ? <Check className="h-[18px] w-[18px]" strokeWidth={2.2} /> : <SquarePlus className="h-[18px] w-[18px]" strokeWidth={1.9} />}
      {!compact && <span>{label}</span>}
    </button>
  );
}
