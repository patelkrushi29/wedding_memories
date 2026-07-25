export const dynamic = 'force-dynamic';

import { AppShell } from '@/components/AppShell';
import { getGalleryTotals } from '@/lib/tags/queries';
import { faceThreshold } from '@/lib/people/tiers';

export default async function PeoplePage() {
  const totals = await getGalleryTotals();
  const threshold = faceThreshold(totals.photos);

  return (
    <AppShell>
      <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-4 sm:pt-10">
        <header className="pb-6">
          <h1 className="display text-[27px] sm:text-[34px]">Find your photos</h1>
          <div className="mono mt-2">Tap yourself · or search a name</div>
        </header>

        <div className="rounded-panel border border-veil bg-plate p-6">
          <div className="mono mono-on">Not ready yet</div>
          <p className="mt-3 text-[15px] leading-relaxed text-paper">
            Everyone who appears in the photographs will show up here as a face you can tap — no
            selfie, no sign-in.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-ash">
            The wall appears once the photographs have been read for faces. Anyone in fewer than{' '}
            {threshold} of them will sit behind a &ldquo;show more&rdquo; so the list stays short,
            and anyone who asks to be hidden will not be listed at all.
          </p>
        </div>

        <div className="sprockets mt-8">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[58px] w-[58px] shrink-0 rounded-[3px] bg-veil/50" />
            ))}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
