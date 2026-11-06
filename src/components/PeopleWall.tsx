'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useMe } from '@/lib/meStore';
import { FaceAvatar } from './FaceAvatar';
import { YouCard } from './YouCard';
import type { PersonTier } from '@/lib/people/tiers';
import type { PersonSummary } from '@/lib/people/eventsSentence';

interface Props {
  tiers: PersonTier<PersonSummary>[];
  totalPeople: number;
}

/** The face wall: tap yourself. Tiered by how often someone appears, never truncated. */
export function PeopleWall({ tiers, totalPeople }: Props) {
  const me = useMe();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  return (
    <main className="mx-auto max-w-3xl px-5 pt-8 sm:px-8 sm:pt-12">
      {me.length > 0 ? (
        <YouCard slug={me[0]} />
      ) : (
        <>
          <h1 className="display text-[44px]">Find yourself</h1>
          <p className="mt-2 text-[15px] text-ash">Tap your face. No selfie, no sign-up — it&rsquo;s remembered on this phone only.</p>
        </>
      )}

      <div className="mt-8 flex flex-col gap-8">
        {tiers.map((tier) => {
          const expanded = !tier.collapsed || open[tier.key];
          return (
            <section key={tier.key}>
              <div className="eyebrow mb-3">
                {tier.label} · {tier.people.length} {tier.people.length === 1 ? 'person' : 'people'}
              </div>
              {expanded ? (
                <div className="grid grid-cols-4 gap-x-3 gap-y-5 sm:grid-cols-6">
                  {tier.people.map((p) => (
                    <Link key={p.id} href={`/people/${p.slug}`} className="flex flex-col items-center gap-1.5 text-center">
                      <FaceAvatar url={p.faceThumbnailUrl} size={72} ring={me.includes(p.slug)} />
                      <span className="w-full truncate text-[12.5px] font-medium">
                        {me.includes(p.slug) ? 'You' : p.name ?? ' '}
                      </span>
                      <span className="meta -mt-1 text-[11.5px]">{p.photoCount}</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => setOpen((o) => ({ ...o, [tier.key]: true }))}
                  className="flex w-full items-center gap-3 rounded-card bg-plate p-4 text-left"
                >
                  <div className="flex">
                    {tier.people.slice(0, 4).map((p, i) => (
                      <FaceAvatar key={p.id} url={p.faceThumbnailUrl} size={36} className={i ? '-ml-2.5 border-2 border-plate' : 'border-2 border-plate'} />
                    ))}
                  </div>
                  <span className="flex-1 text-[14px]">
                    Show {tier.people.length} more{tier.key === 'rest' ? ' — mostly faces in the crowd' : ''}
                  </span>
                  <ChevronRight className="h-5 w-5 text-ash" />
                </button>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-10 text-[13px] leading-relaxed text-dim">
        {totalPeople}{' '}people found in the photos. Anyone who asks the couple to be left out isn&rsquo;t shown here.
      </p>
    </main>
  );
}
