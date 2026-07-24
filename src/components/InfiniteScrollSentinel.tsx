'use client';

import { useEffect, useRef } from 'react';

interface Props {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
}

/** Invisible sentinel that triggers onLoadMore when scrolled near the viewport. */
export function InfiniteScrollSentinel({ onLoadMore, hasMore, loading }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cbRef = useRef(onLoadMore);
  cbRef.current = onLoadMore;

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) cbRef.current();
      },
      { rootMargin: '800px 0px' } // start loading well before the user reaches the end
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  if (!hasMore) return null;

  return (
    <div ref={ref} className="py-8 flex justify-center">
      {loading && (
        <div className="h-6 w-6 rounded-full border-2 border-[#c9a96e] border-t-transparent animate-spin" />
      )}
    </div>
  );
}
