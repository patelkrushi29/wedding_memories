export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { FunctionGallery } from '@/components/FunctionGallery';
import { getFunctionBySlug, getFunctionAssets } from '@/lib/tags/queries';

function timeSpan(startAt: string | null, endAt: string | null): string | null {
  if (!startAt) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const start = fmt(startAt);
  if (!endAt || fmt(endAt) === start) return start;
  return `${start}–${fmt(endAt)}`;
}

export default async function FunctionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const fn = await getFunctionBySlug(slug);
  if (!fn) notFound();

  const assets = await getFunctionAssets(fn.id, 60);
  const span = timeSpan(fn.startAt, fn.endAt);

  return (
    <AppShell>
      <main className="max-w-5xl mx-auto sm:px-8 pt-4 sm:pt-8">
        <div className="px-5 sm:px-0">
          <Link href="/" className="mono inline-flex items-center gap-1 text-dim hover:text-paper">
            <ChevronLeft className="h-3.5 w-3.5" />
            {fn.dayName || 'The days'}
          </Link>

          <header className="pt-4 pb-5">
            <h1 className="display text-[30px] sm:text-[40px]">{fn.name}</h1>
            <div className="mono mt-2">
              {[span, `${fn.assetCount.toLocaleString()} items`].filter(Boolean).join(' · ')}
            </div>
          </header>
        </div>

        <FunctionGallery
          slug={fn.slug}
          initialAssets={assets}
          photoCount={fn.photoCount}
          videoCount={fn.videoCount}
        />
      </main>
    </AppShell>
  );
}
