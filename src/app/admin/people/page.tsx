'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, Eye, EyeOff, Merge } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminPerson {
  id: string;
  slug: string;
  name: string;
  isVisible: boolean;
  photoCount: number;
  faceUrl: string | null;
}

/**
 * Host tools for people: name them (named people are pinned to the top of the
 * wall), hide anyone who asks to be left out, merge a person split in two.
 */
export default function AdminPeoplePage() {
  const [people, setPeople] = useState<AdminPerson[]>([]);
  const [secret, setSecret] = useState('');
  const [locked, setLocked] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the host secret once
      setSecret(localStorage.getItem('wedding-admin-secret') ?? '');
    } catch {}
  }, []);

  const headers = useCallback(
    (): Record<string, string> => ({ 'Content-Type': 'application/json', ...(secret ? { Authorization: `Bearer ${secret}` } : {}) }),
    [secret]
  );

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/people', { headers: headers() });
    if (res.status === 401) {
      setLocked(true);
      return;
    }
    setLocked(false);
    setPeople(await res.json());
  }, [headers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- host-only page; load on mount and when the secret changes
    load();
  }, [load]);

  const patch = async (p: AdminPerson, body: { name?: string; isVisible?: boolean }) => {
    await fetch(`/api/admin/tags/${p.id}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) });
    load();
  };

  const merge = async () => {
    if (picked.length !== 2) return;
    // Keep the bigger group's identity: guests are more likely to have claimed it.
    const [a, b] = picked.map((id) => people.find((p) => p.id === id)!);
    const [into, from] = a.photoCount >= b.photoCount ? [a, b] : [b, a];
    const res = await fetch('/api/admin/people/merge', { method: 'POST', headers: headers(), body: JSON.stringify({ from: from.id, into: into.id }) });
    setMessage(res.ok ? `Merged — ${into.name || 'that person'} now has both sets of photos.` : 'Merge failed.');
    setPicked([]);
    load();
  };

  return (
    <main className="mx-auto max-w-3xl px-5 pb-32 pt-6">
      <Link href="/admin" className="-ml-3 flex h-11 w-11 items-center justify-center" aria-label="Back to host tools">
        <ChevronLeft className="h-6 w-6" />
      </Link>
      <h1 className="display text-[36px]">People</h1>
      <p className="mt-2 text-[14px] text-ash">
        Name people to pin them to the top of the wall. Hide anyone who asks to be left out. Pick two faces that are the
        same person and merge them.
      </p>

      {locked && (
        <div className="mt-6 rounded-card bg-plate p-4">
          <label htmlFor="secret" className="text-[14px]">Host secret</label>
          <input
            id="secret"
            type="password"
            value={secret}
            onChange={(e) => {
              setSecret(e.target.value);
              try {
                localStorage.setItem('wedding-admin-secret', e.target.value);
              } catch {}
            }}
            className="mt-2 h-12 w-full rounded-full border border-veil bg-ink px-4"
          />
        </div>
      )}

      {message && <p className="mt-4 text-[14px] text-accent" role="status">{message}</p>}

      {people.length === 0 && !locked ? (
        <p className="mt-8 text-ash">No people yet. Run the photo pipeline with face finding switched on.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {people.map((p) => {
            const on = picked.includes(p.id);
            return (
              <li key={p.id} className={cn('flex items-center gap-3 rounded-card bg-plate p-3', !p.isVisible && 'opacity-50')}>
                <button
                  onClick={() => setPicked((s) => (on ? s.filter((x) => x !== p.id) : [...s, p.id].slice(-2)))}
                  aria-pressed={on}
                  aria-label={on ? 'Unselect for merge' : 'Select for merge'}
                  className={cn('h-14 w-14 shrink-0 overflow-hidden rounded-full', on && 'ring-2 ring-accent ring-offset-2 ring-offset-plate')}
                >
                  {p.faceUrl && <img src={p.faceUrl} alt="" className="h-full w-full object-cover" />}
                </button>
                <div className="min-w-0 flex-1">
                  <input
                    aria-label="Name"
                    placeholder="Add a name"
                    value={names[p.id] ?? p.name}
                    onChange={(e) => setNames((n) => ({ ...n, [p.id]: e.target.value }))}
                    onBlur={() => names[p.id] !== undefined && names[p.id] !== p.name && patch(p, { name: names[p.id] })}
                    className="h-10 w-full rounded-[10px] border border-transparent bg-transparent px-2 text-[15px] focus:border-veil focus:outline-none"
                  />
                  <div className="meta px-2">{p.photoCount} photos{p.isVisible ? '' : ' · hidden'}</div>
                </div>
                <button
                  onClick={() => patch(p, { isVisible: !p.isVisible })}
                  aria-label={p.isVisible ? 'Hide from guests' : 'Show to guests'}
                  className="flex h-11 w-11 items-center justify-center text-ash"
                >
                  {p.isVisible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {picked.length === 2 && (
        <div className="fixed inset-x-4 bottom-6 z-50 mx-auto max-w-3xl">
          <button onClick={merge} className="btn btn-accent w-full">
            <Merge className="h-[18px] w-[18px]" />
            These two are the same person — merge
          </button>
        </div>
      )}
    </main>
  );
}
