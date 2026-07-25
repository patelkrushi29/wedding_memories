'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * Global error boundary. An empty gallery and a broken gallery must never look
 * the same — that ambiguity hid a database outage for days.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Gallery error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mono mono-on">Something broke</div>
        <h1 className="display mt-4 text-[28px]">
          The gallery could not <em>be reached</em>
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-ash">
          This is a problem on our side, not with your connection or your photographs. Nothing has
          been lost.
        </p>

        <button
          onClick={reset}
          className="mt-7 inline-flex h-[50px] w-full items-center justify-center gap-2 rounded-card bg-paper text-[15px] font-semibold text-ink"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>

        {error.digest && <div className="numeral mt-6 text-dim">Reference {error.digest}</div>}
      </div>
    </div>
  );
}
