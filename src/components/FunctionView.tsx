'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Play } from 'lucide-react';
import { FunctionGallery } from './FunctionGallery';
import { StoryReel, type ReelItem } from './StoryReel';
import type { Asset } from '@/types/asset';

interface Props {
  fn: { slug: string; name: string; eyebrow: string; photoCount: number; videoCount: number };
  highlights: ReelItem[];
  initialAssets: Asset[];
  initialTotal: number;
}

/** One event: cover, its best moments, then every photo with bursts folded. */
export function FunctionView({ fn, highlights, initialAssets, initialTotal }: Props) {
  const [reelAt, setReelAt] = useState<number | null>(null);
  const close = useCallback(() => setReelAt(null), []);
  const cover = highlights[0] ?? initialAssets[0];
  const total = fn.photoCount + fn.videoCount;

  return (
    <>
      <section className="relative h-[46svh] min-h-[340px] max-h-[520px] overflow-hidden md:mx-auto md:mt-6 md:max-w-5xl md:rounded-panel">
        {cover && (
          <>
            {cover.blurDataUrl && <img src={cover.blurDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <img src={cover.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </>
        )}
        <div className="scrim-t" />
        <div className="scrim-b" />
        <Link
          href="/"
          aria-label="Back to home"
          className="absolute left-2 flex h-11 w-11 items-center justify-center rounded-full text-paper"
          style={{ top: 'calc(8px + env(safe-area-inset-top))' }}
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
        </Link>
        <div className="absolute inset-x-5 bottom-5 md:inset-x-10 md:bottom-8">
          {fn.eyebrow && <div className="eyebrow eyebrow-on">{fn.eyebrow}</div>}
          <h1 className="display mt-1.5 text-[46px] md:text-[64px]">{fn.name}</h1>
          <div className="mt-3 flex items-center gap-3">
            {highlights.length > 0 && (
              <button onClick={() => setReelAt(0)} className="btn btn-accent h-11 pl-3 pr-4 text-[14px]">
                <Play className="h-3.5 w-3.5" fill="currentColor" />
                Play the best {highlights.length}
              </button>
            )}
            <span className="meta text-paper/80">{total.toLocaleString()} photos</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl">
        {highlights.length > 0 && (
          <section className="pt-6">
            <h2 className="display px-5 pb-3 text-[20px] tracking-normal md:px-0">The best moments</h2>
            <div className="flex gap-2 overflow-x-auto px-5 scrollbar-none md:px-0">
              {highlights.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setReelAt(i)}
                  className="h-[150px] w-[120px] shrink-0 overflow-hidden rounded-[12px] bg-plate"
                  style={a.blurDataUrl ? { backgroundImage: `url(${a.blurDataUrl})`, backgroundSize: 'cover' } : undefined}
                  aria-label={`Open best moment ${i + 1}`}
                >
                  <img src={a.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        )}

        <section id="all" className="scroll-mt-4 pt-7">
          <div className="flex items-baseline justify-between px-5 pb-3 md:px-0">
            <h2 className="display text-[20px] tracking-normal">Every photo</h2>
            {initialTotal < total && (
              <span className="meta">{(total - initialTotal).toLocaleString()} near-duplicates tucked away</span>
            )}
          </div>
          <FunctionGallery
            slug={fn.slug}
            initialAssets={initialAssets}
            initialTotal={initialTotal}
            photoCount={fn.photoCount}
            videoCount={fn.videoCount}
          />
        </section>
      </div>

      {reelAt !== null && (
        <StoryReel
          slides={highlights}
          startIndex={reelAt}
          label={fn.name}
          onClose={close}
          endCard={{
            title: `That was the ${fn.name}`,
            body: 'Every photo is below — near-identical shots are stacked behind the best take.',
            href: `/functions/${fn.slug}#all`,
            cta: 'See every photo',
          }}
        />
      )}
    </>
  );
}
