'use client';

import { useEffect, useRef } from 'react';

interface Props {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  /** Set when the last page failed; shows a retry instead of spinning forever. */
  failed?: boolean;
}

/** Invisible sentinel that triggers onLoadMore when scrolled near the viewport. */
export function InfiniteScrollSentinel({ onLoadMore, hasMore, loading, failed }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cbRef = useRef(onLoadMore);
  useEffect(() => {
    cbRef.current = onLoadMore;
  }, [onLoadMore]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasMore || failed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) cbRef.current();
      },
      { rootMargin: '800px 0px' } // start loading well before the user reaches the end
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, failed]);

  if (!hasMore) return null;

  return (
    <div ref={ref} className="flex justify-center py-8">
      {failed ? (
        <button onClick={() => cbRef.current()} className="eyebrow eyebrow-on">
          Couldn&rsquo;t load more · Try again
        </button>
      ) : loading ? (
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      ) : null}
    </div>
  );
}
