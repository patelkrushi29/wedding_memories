'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { FaceAvatar } from './FaceAvatar';
import type { Asset } from '@/types/asset';

export interface MePerson {
  slug: string;
  name: string | null;
  photoCount: number;
  faceThumbnailUrl: string | null;
  functions: { slug: string; name: string; count: number }[];
  best: Asset[];
}

/** Fetch the claimed person's summary. Identity lives on the device; the server only answers. */
export function useMePerson(slug: string | undefined): MePerson | null | undefined {
  const [data, setData] = useState<{ slug: string; person: MePerson | null } | null>(null);
  useEffect(() => {
    if (!slug) return;
    let live = true;
    fetch(`/api/me?slugs=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : { people: [] }))
      .then((d) => live && setData({ slug, person: d.people?.[0] ?? null }))
      .catch(() => live && setData({ slug, person: null }));
    return () => {
      live = false;
    };
  }, [slug]);
  if (!slug) return null;
  return data?.slug === slug ? data.person : undefined; // undefined = loading
}

/** "You" header: your face, your count, your best — the payoff of "That's me". */
export function YouCard({ slug }: { slug: string }) {
  const me = useMePerson(slug);
  if (me === undefined) return <div className="h-[132px] animate-pulse rounded-card bg-plate" />;
  if (me === null) return null;

  return (
    <Link href={`/people/${slug}`} className="block rounded-card bg-plate p-4">
      <div className="flex items-center gap-4">
        <FaceAvatar url={me.faceThumbnailUrl} size={64} ring />
        <div className="min-w-0 flex-1">
          <div className="display text-[26px]">Your best</div>
          <div className="text-[13.5px] text-ash">
            {me.best.length} keepers from {me.photoCount} photos of you
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-accent" />
      </div>
      <div className="mt-3 flex gap-1.5 overflow-hidden">
        {me.best.slice(0, 5).map((a) => (
          <img key={a.id} src={a.thumbnailUrl} alt="" className="h-[72px] w-[58px] shrink-0 rounded-[8px] object-cover" />
        ))}
      </div>
    </Link>
  );
}
