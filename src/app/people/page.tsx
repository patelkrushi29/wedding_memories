export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { ScanFace, Sparkles, Share } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { PeopleWall } from '@/components/PeopleWall';
import { getGalleryTotals } from '@/lib/tags/queries';
import { listPeople } from '@/lib/people/queries';
import { tierPeople } from '@/lib/people/tiers';

const STEPS = [
  { icon: ScanFace, title: 'Tap your face', body: 'Everyone in the photos appears as a face. No selfie, no sign-up.' },
  { icon: Sparkles, title: 'Get your best', body: 'The sharpest shots of you, eyes open — not 900 photos to scroll.' },
  { icon: Share, title: 'Make a post', body: 'Turn your favourites into a story or carousel, right on your phone.' },
];

export default async function PeoplePage() {
  const [totals, people] = await Promise.all([getGalleryTotals(), listPeople()]);

  if (people.length > 0) {
    const tiers = tierPeople(people, totals.photos);
    return (
      <AppShell>
        <PeopleWall tiers={tiers} totalPeople={people.length} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-5 pt-8 sm:px-8 sm:pt-12">
        <div className="eyebrow eyebrow-on">Coming soon</div>
        <h1 className="display mt-2 text-[44px]">Find your best photos</h1>
        <p className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-ash">
          We&rsquo;re reading all {totals.photos.toLocaleString()}{' '}photos for faces. When that&rsquo;s done, this is
          where you&rsquo;ll find yourself.
        </p>

        <ol className="mt-8 flex flex-col gap-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex items-start gap-4 rounded-card bg-plate p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-deep text-accent">
                <step.icon className="h-5 w-5" strokeWidth={1.9} />
              </span>
              <div>
                <div className="text-[15px] font-semibold">
                  <span className="text-ash">{i + 1}.</span> {step.title}
                </div>
                <div className="mt-0.5 text-[14px] leading-snug text-ash">{step.body}</div>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-6 text-[13px] leading-relaxed text-dim">
          Anyone can ask to be left out of face search — they won&rsquo;t appear here at all.
        </p>

        <Link href="/" className="btn btn-ghost mt-6 w-full">
          Meanwhile, watch the highlights
        </Link>
      </main>
    </AppShell>
  );
}
