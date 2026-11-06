'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StoryReel, type ReelItem } from './StoryReel';
import { FindYourselfCard } from './FindYourselfCard';

export interface HomeFunction {
  slug: string;
  name: string;
  dayLabel: string;
  assetCount: number;
  coverThumbnailUrl: string | null;
  highlights: ReelItem[];
}

interface Props {
  coupleNames: string;
  statsLine: string;
  cover: ReelItem | null;
  functions: HomeFunction[];
}

type Open = { kind: 'weekend'; start: number } | { kind: 'function'; slug: string; start: number } | null;

// "Seen" rings, remembered on this device only.
const SEEN_KEY = 'wedding-stories-seen';
const seenListeners = new Set<() => void>();
function readSeen(): string {
  try {
    return localStorage.getItem(SEEN_KEY) ?? '';
  } catch {
    return '';
  }
}
function markSeen(slug: string) {
  const set = new Set(readSeen().split(',').filter(Boolean));
  set.add(slug);
  try {
    localStorage.setItem(SEEN_KEY, [...set].join(','));
  } catch {}
  seenListeners.forEach((l) => l());
}
function useSeen(): Set<string> {
  const raw = useSyncExternalStore(
    (l) => {
      seenListeners.add(l);
      return () => seenListeners.delete(l);
    },
    readSeen,
    () => ''
  );
  return new Set(raw.split(',').filter(Boolean));
}

/** The home screen: cover + watch, function stories, find-yourself, best-of rows. */
export function HomeExperience({ coupleNames, statsLine, cover, functions }: Props) {
  const [open, setOpen] = useState<Open>(null);
  const seen = useSeen();
  const weekend = functions.flatMap((f) => f.highlights);
  const close = useCallback(() => setOpen(null), []);

  const openFn = open?.kind === 'function' ? functions.find((f) => f.slug === open.slug) : null;
  useEffect(() => {
    if (openFn) markSeen(openFn.slug);
  }, [openFn]);

  const [first, last] = [coupleNames.split('&')[0]?.trim(), coupleNames.split('&')[1]?.trim()];

  return (
    <>
      {/* Cover */}
      <section className="relative h-[58svh] min-h-[420px] max-h-[620px] overflow-hidden md:mx-auto md:mt-6 md:max-w-5xl md:rounded-panel">
        {cover && (
          <>
            {cover.blurDataUrl && <img src={cover.blurDataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <img src={cover.previewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
          </>
        )}
        <div className="scrim-t" />
        <div className="scrim-b" style={{ height: '70%' }} />
        <div className="absolute inset-x-5 bottom-6 flex flex-col gap-3 md:inset-x-10 md:bottom-10">
          <div className="eyebrow eyebrow-on">{statsLine}</div>
          <h1 className="display text-[52px] md:text-[76px]">
            {last ? (
              <>
                {first}
                <br />&amp; {last}
              </>
            ) : (
              coupleNames
            )}
          </h1>
          {weekend.length > 0 && (
            <button onClick={() => setOpen({ kind: 'weekend', start: 0 })} className="btn btn-accent mt-1 self-start pl-3.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-ink text-accent">
                <Play className="h-3 w-3" fill="currentColor" />
              </span>
              Watch the weekend
              <span className="font-normal opacity-70">· {weekend.length} moments</span>
            </button>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-5xl">
        {/* Function stories */}
        <section className="flex gap-4 overflow-x-auto px-5 pb-1 pt-5 scrollbar-none md:px-0" aria-label="Events">
          {functions.map((fn) => (
            <button
              key={fn.slug}
              onClick={() => setOpen({ kind: 'function', slug: fn.slug, start: 0 })}
              className="flex w-[70px] shrink-0 flex-col items-center gap-1.5"
            >
              <span className={cn('story-ring block h-[68px] w-[68px]', seen.has(fn.slug) && 'ring-seen')}>
                <span className="block h-full w-full overflow-hidden rounded-full border-[3px] border-ink bg-plate">
                  {fn.coverThumbnailUrl && <img src={fn.coverThumbnailUrl} alt="" className="h-full w-full object-cover" />}
                </span>
              </span>
              <span className="w-full truncate text-center text-[12.5px] font-medium">{fn.name}</span>
            </button>
          ))}
        </section>

        {/* Find yourself → Your best */}
        <FindYourselfCard previews={weekend} />

        {/* Best of each function */}
        {functions.map((fn) => (
          <section key={fn.slug} className="pt-7">
            <div className="flex items-end justify-between px-5 pb-3 md:px-0">
              <div>
                <div className="eyebrow">{fn.dayLabel}</div>
                <h2 className="display mt-1 text-[24px]">Best of the {fn.name}</h2>
              </div>
              <Link href={`/functions/${fn.slug}`} className="flex h-11 items-center gap-0.5 text-[13.5px] font-semibold text-accent">
                All {fn.assetCount.toLocaleString()}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto px-5 scrollbar-none md:px-0">
              {fn.highlights.map((a, i) => (
                <button
                  key={a.id}
                  onClick={() => setOpen({ kind: 'function', slug: fn.slug, start: i })}
                  className="relative h-[190px] w-[150px] shrink-0 overflow-hidden rounded-[14px] bg-plate"
                  style={a.blurDataUrl ? { backgroundImage: `url(${a.blurDataUrl})`, backgroundSize: 'cover' } : undefined}
                  aria-label={`Open highlight ${i + 1} of the ${fn.name}`}
                >
                  <img src={a.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      {open?.kind === 'weekend' && (
        <StoryReel slides={weekend} startIndex={open.start} label="The weekend" onClose={close} />
      )}
      {openFn && open?.kind === 'function' && (
        <StoryReel
          slides={openFn.highlights}
          startIndex={open.start}
          label={openFn.name}
          onClose={close}
          endCard={{
            title: `That was the ${openFn.name}`,
            body: `${openFn.highlights.length} highlights from ${openFn.assetCount.toLocaleString()} photos.`,
            href: `/functions/${openFn.slug}`,
            cta: `See all ${openFn.assetCount.toLocaleString()}`,
          }}
        />
      )}
    </>
  );
}
