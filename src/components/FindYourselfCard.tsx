'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMe } from '@/lib/meStore';
import { FaceAvatar } from './FaceAvatar';
import { useMePerson } from './YouCard';
import type { Asset } from '@/types/asset';

interface Props {
  /** Shown before the visitor has claimed a face. */
  previews: Asset[];
}

/** Home's entry to "Your best": a prompt until you tap your face, then your own best. */
export function FindYourselfCard({ previews }: Props) {
  const me = useMe();
  const person = useMePerson(me[0]);

  if (person) {
    return (
      <Link href={`/people/${person.slug}`} className="mx-4 mt-5 flex items-center gap-3.5 rounded-card bg-plate p-4 md:mx-0">
        <FaceAvatar url={person.faceThumbnailUrl} size={48} ring />
        <div className="min-w-0 flex-1">
          <div className="display text-[18px] tracking-normal">Your best</div>
          <div className="text-[13px] text-ash">
            {person.best.length} keepers from {person.photoCount} photos of you
          </div>
        </div>
        <div className="flex shrink-0">
          {person.best.slice(0, 3).map((a, i) => (
            <img key={a.id} src={a.thumbnailUrl} alt="" className={cn('h-11 w-9 rounded-[6px] border-2 border-plate object-cover', i > 0 && '-ml-2')} />
          ))}
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-accent" />
      </Link>
    );
  }

  return (
    <Link href="/people" className="mx-4 mt-5 flex items-center gap-3.5 rounded-card bg-plate p-4 md:mx-0">
      <div className="flex shrink-0">
        {previews.slice(0, 3).map((a, i) => (
          <img key={a.id} src={a.thumbnailUrl} alt="" className={cn('h-11 w-11 rounded-full border-2 border-plate object-cover', i > 0 && '-ml-3.5')} />
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="display text-[18px] tracking-normal">Find your best photos</div>
        <div className="text-[13px] text-ash">Tap your face. No selfie, no sign-up.</div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-accent" />
    </Link>
  );
}
