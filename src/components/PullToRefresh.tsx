'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

const TRIGGER = 70; // px of pull needed to refresh

/** Touch pull-to-refresh wrapper for feed-style pages. */
export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 0 && !refreshing) startY.current = e.touches[0].clientY;
    else startY.current = null;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY <= 0) {
      setPull(Math.min(110, dy * 0.45)); // resistance
    } else {
      setPull(0);
    }
  };

  const onTouchEnd = () => {
    startY.current = null;
    if (pull >= TRIGGER && !refreshing) {
      setRefreshing(true);
      setPull(48);
      router.refresh();
      setTimeout(() => {
        setRefreshing(false);
        setPull(0);
      }, 900);
    } else {
      setPull(0);
    }
  };

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-end justify-center overflow-hidden"
        style={{
          height: pull,
          transition: startY.current === null ? 'height 0.25s ease' : 'none',
        }}
      >
        <RefreshCw
          className={`h-5 w-5 mb-3 text-[#c9a96e] ${refreshing ? 'animate-spin' : ''}`}
          style={{
            transform: refreshing ? undefined : `rotate(${pull * 2.5}deg)`,
            opacity: Math.min(1, pull / TRIGGER),
          }}
        />
      </div>
      {children}
    </div>
  );
}
