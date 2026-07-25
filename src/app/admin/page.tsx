'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminFunction {
  id: string;
  name: string;
  slug: string;
  isVisible: boolean;
  source: string | null;
  startAt: string | null;
  endAt: string | null;
  dayName: string | null;
  daySlug: string | null;
  assetCount: number;
  sampleThumbnails: string[];
}

interface Totals {
  photos: number;
  videos: number;
  days: number;
  functions: number;
}

export default function HostPage() {
  const [functions, setFunctions] = useState<AdminFunction[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [secret, setSecret] = useState('');
  const [locked, setLocked] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const authHeaders = useCallback(
    (): Record<string, string> => (secret ? { Authorization: `Bearer ${secret}` } : {}),
    [secret]
  );

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/tags', { headers: authHeaders() });
      if (res.status === 401) {
        setLocked(true);
        setFunctions([]);
        return;
      }
      setLocked(false);
      setFunctions(await res.json());

      const [photos, videos, tags] = await Promise.all([
        fetch('/api/assets?type=PHOTO&limit=1').then((r) => r.json()),
        fetch('/api/assets?type=VIDEO&limit=1').then((r) => r.json()),
        fetch('/api/tags?kind=FUNCTION').then((r) => (r.ok ? r.json() : [])),
      ]);
      setTotals({
        photos: photos.total || 0,
        videos: videos.total || 0,
        functions: Array.isArray(tags) ? tags.length : 0,
        days: 0,
      });
    } finally {
      setBusy(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (fn: AdminFunction, patch: { name?: string; isVisible?: boolean }) => {
    const res = await fetch(`/api/admin/tags/${fn.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(patch),
    });
    if (res.ok) load();
  };

  const remove = async (fn: AdminFunction) => {
    if (!confirm(`Remove the grouping "${fn.name}"? The photographs stay; only the function is deleted.`))
      return;
    const res = await fetch(`/api/admin/tags/${fn.id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) load();
  };

  // Group functions under their day heading
  const days = functions.reduce<{ name: string; items: AdminFunction[] }[]>((acc, fn) => {
    const key = fn.dayName || 'Unassigned';
    const found = acc.find((d) => d.name === key);
    if (found) found.items.push(fn);
    else acc.push({ name: key, items: [fn] });
    return acc;
  }, []);

  const hhmm = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="min-h-screen bg-ink">
      <header className="border-b border-veil">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5 sm:px-8">
          <div>
            <h1 className="display text-[22px]">Host</h1>
            <div className="mono mt-1.5">
              {totals
                ? `${totals.photos.toLocaleString()} photographs · ${totals.videos} film · ${totals.functions} published`
                : 'Loading…'}
            </div>
          </div>
          <Link href="/" className="mono hover:text-paper">
            View gallery →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-7 sm:px-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="display text-[19px]">Functions</h2>
            <p className="mt-1.5 text-sm text-ash">
              Candidates come from <span className="font-mono text-[12px]">npm run cluster:events</span>.
              Name them, then publish — hidden functions never appear to guests.
            </p>
          </div>
          <button onClick={load} className="mono flex items-center gap-1.5 hover:text-paper" disabled={busy}>
            <RefreshCw className={cn('h-3.5 w-3.5', busy && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {locked && (
          <div className="mb-6 rounded-card border border-veil bg-plate p-4">
            <div className="mono mb-3">Admin secret required</div>
            <div className="flex gap-2">
              <input
                type="password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="ADMIN_REINDEX_SECRET"
                className="h-10 flex-1 rounded-[8px] border border-veil bg-ink px-3 text-sm text-paper placeholder:text-dim focus:border-halide focus:outline-none"
              />
              <button
                onClick={load}
                className="h-10 rounded-[8px] bg-paper px-4 text-sm font-semibold text-ink"
              >
                Unlock
              </button>
            </div>
          </div>
        )}

        {!locked && functions.length === 0 && (
          <p className="py-16 text-center text-sm text-ash">
            No functions yet. Run the clustering script after syncing photographs.
          </p>
        )}

        <div className="flex flex-col gap-7">
          {days.map((day) => (
            <section key={day.name}>
              <div className="mono mb-3">{day.name}</div>
              <div className="flex flex-col gap-2">
                {day.items.map((fn) => (
                  <div
                    key={fn.id}
                    className="flex items-center gap-3 rounded-card border border-veil bg-plate p-3"
                  >
                    <div className="flex shrink-0 -space-x-2">
                      {fn.sampleThumbnails.slice(0, 3).map((src, i) => (
                        <img
                          key={i}
                          src={src}
                          alt=""
                          className="h-11 w-11 rounded-[6px] border-2 border-plate object-cover"
                        />
                      ))}
                    </div>

                    <div className="min-w-0 flex-1">
                      <input
                        defaultValue={fn.name}
                        onChange={(e) => setEdits((p) => ({ ...p, [fn.id]: e.target.value }))}
                        onBlur={() => {
                          const name = edits[fn.id];
                          if (name && name.trim() && name !== fn.name) save(fn, { name });
                        }}
                        placeholder="Name this function"
                        className="h-9 w-full rounded-[8px] border border-transparent bg-ink px-2.5 text-[15px] text-paper placeholder:text-dim hover:border-veil focus:border-halide focus:outline-none"
                      />
                      <div className="numeral mt-1.5 truncate">
                        {fn.assetCount.toLocaleString()} items
                        {fn.startAt && ` · ${hhmm(fn.startAt)}–${hhmm(fn.endAt)}`}
                      </div>
                    </div>

                    <button
                      onClick={() => save(fn, { isVisible: !fn.isVisible })}
                      className={cn('chip', fn.isVisible && 'chip-on')}
                      title={fn.isVisible ? 'Published — click to hide' : 'Hidden — click to publish'}
                    >
                      {fn.isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {fn.isVisible ? 'Live' : 'Hidden'}
                    </button>

                    <button
                      onClick={() => remove(fn)}
                      className="p-2 text-dim transition-colors hover:text-[#E08A6A]"
                      title="Delete grouping"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
