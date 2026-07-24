'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { EventTag } from '@/types/asset';

interface Props {
  selected: string; // event slug or ''
  onSelect: (slug: string) => void;
}

/** Horizontally scrollable event filter chips. Renders nothing until events exist. */
export function EventChips({ selected, onSelect }: Props) {
  const [events, setEvents] = useState<EventTag[]>([]);

  useEffect(() => {
    fetch('/api/tags?kind=EVENT')
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="sticky top-14 md:top-16 z-30 -mx-3 sm:mx-0 px-3 sm:px-0 py-2 bg-[#faf9f6]/95 backdrop-blur-sm">
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5">
        <button
          onClick={() => onSelect('')}
          className={cn(
            'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
            !selected
              ? 'bg-[#c9a96e] text-white border-[#c9a96e]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#c9a96e]/50'
          )}
        >
          All
        </button>
        {events.map((event) => (
          <button
            key={event.id}
            onClick={() => onSelect(selected === event.slug ? '' : event.slug)}
            className={cn(
              'shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
              selected === event.slug
                ? 'bg-[#c9a96e] text-white border-[#c9a96e]'
                : 'bg-white text-gray-600 border-gray-200 hover:border-[#c9a96e]/50'
            )}
          >
            {event.name}
            <span className="ml-1.5 opacity-60 text-xs">{event.assetCount}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
