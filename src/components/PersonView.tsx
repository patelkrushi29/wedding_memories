'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, LayoutGrid, Play } from 'lucide-react';
import { claimMe, unclaimMe, useMe } from '@/lib/meStore';
import { POST_LIMIT, setPost } from '@/lib/postBasket';
import { recapLine, type PersonDetail } from '@/lib/people/eventsSentence';
import { FaceAvatar } from './FaceAvatar';
import { MediaGrid } from './MediaGrid';
import { StoryReel, type ReelItem } from './StoryReel';
import type { Asset } from '@/types/asset';

interface Props {
  person: PersonDetail;
  best: ReelItem[];
  initialAssets: Asset[];
  initialTotal: number;
}

/** One person: claim them as yourself, then their best photos and everything else. */
export function PersonView({ person, best, initialAssets, initialTotal }: Props) {
  const me = useMe();
  const router = useRouter();
  const isMe = me.includes(person.slug);
  const [reelAt, setReelAt] = useState<number | null>(null);
  const close = () => setReelAt(null);

  const title = isMe ? 'Your best' : person.name ? `${person.name}’s best` : 'Their best';
  const recap = recapLine({ isMe, name: person.name, events: person.functions.map((f) => f.name) });
  const label = isMe ? 'You' : person.name || 'Their best';

  return (
    <>
      <div className="mx-auto max-w-3xl px-5 pt-3 sm:px-8">
        <Link href="/people" aria-label="Back to everyone" className="-ml-3 flex h-11 w-11 items-center justify-center">
          <ChevronLeft className="h-6 w-6" strokeWidth={2.2} />
        </Link>

        <header className="flex items-center gap-4 pt-1">
          <FaceAvatar url={person.faceThumbnailUrl} size={96} ring={isMe} />
          <div className="min-w-0">
            <h1 className="display text-[38px]">{isMe ? 'You' : person.name || 'In the photos'}</h1>
            <div className="meta mt-1">
              In {person.photoCount.toLocaleString()} {person.photoCount === 1 ? 'photo' : 'photos'}
            </div>
          </div>
        </header>

        {recap && <p className="mt-4 text-[15px] leading-relaxed text-ash">{recap}</p>}

        {/* The claim */}
        <div className="mt-5 flex gap-2.5">
          {isMe ? (
            <>
              <span className="btn flex-1 border border-accent bg-accent-deep text-accent">
                <Check className="h-[18px] w-[18px]" strokeWidth={2.4} />
                That&rsquo;s you
              </span>
              <button onClick={() => unclaimMe(person.slug)} className="btn btn-ghost">
                Not me
              </button>
            </>
          ) : (
            <button onClick={() => claimMe(person.slug)} className="btn btn-accent flex-1">
              {me.length ? 'That’s me too' : 'That’s me'}
            </button>
          )}
        </div>
        <p className="mt-2 text-[12.5px] text-dim">
          {isMe ? 'Remembered on this phone only. Nobody else can see it.' : 'Saved on this phone only — no sign-up, no selfie.'}
        </p>

        {/* Event breakdown */}
        {person.functions.length > 1 && (
          <div className="mt-5 flex gap-2 overflow-x-auto scrollbar-none">
            {person.functions.map((f) => (
              <Link key={f.slug} href={`/functions/${f.slug}`} className="chip">
                {f.name} <b>{f.count}</b>
              </Link>
            ))}
          </div>
        )}
      </div>

      {best.length > 0 && (
        <section className="mx-auto max-w-3xl pt-7 sm:px-8">
          <div className="flex items-end justify-between px-5 pb-3 sm:px-0">
            <h2 className="display text-[24px]">{title}</h2>
            <button onClick={() => setReelAt(0)} className="flex h-11 items-center gap-1.5 text-[14px] font-semibold text-accent">
              <Play className="h-3.5 w-3.5" fill="currentColor" />
              Play {best.length}
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto px-5 scrollbar-none sm:px-0">
            {best.map((a, i) => (
              <button
                key={a.id}
                onClick={() => setReelAt(i)}
                className="h-[190px] w-[150px] shrink-0 overflow-hidden rounded-[14px] bg-plate"
                style={a.blurDataUrl ? { backgroundImage: `url(${a.blurDataUrl})`, backgroundSize: 'cover' } : undefined}
                aria-label={`Open best photo ${i + 1}`}
              >
                <img src={a.thumbnailUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          <div className="px-5 pt-4 sm:px-0">
            <button
              onClick={() => {
                setPost(best.slice(0, POST_LIMIT).map((a) => a.id));
                router.push('/post');
              }}
              className="btn btn-ghost w-full"
            >
              <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={2} />
              Make a post from {isMe ? 'your' : 'these'} best
            </button>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-3xl pt-8 sm:px-8">
        <h2 className="display px-5 pb-3 text-[20px] tracking-normal sm:px-0">
          Every photo{isMe ? ' of you' : ''}
        </h2>
        <MediaGrid initialAssets={initialAssets} total={initialTotal} query={`person=${person.slug}&sort=oldest&fold=1`} />
      </section>

      {reelAt !== null && <StoryReel slides={best} startIndex={reelAt} label={label} onClose={close} />}
    </>
  );
}
