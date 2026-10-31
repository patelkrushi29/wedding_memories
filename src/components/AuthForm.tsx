'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

interface Props {
  coupleNames: string;
}

/** The password gate. No photo is shown before the password — nothing private leaks to a forwarded link. */
export function AuthForm({ coupleNames }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/guest-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.ok) {
        // Only same-site paths, so a crafted ?next= can't bounce a guest elsewhere.
        const next = new URLSearchParams(window.location.search).get('next');
        router.push(next && next.startsWith('/') && !next.startsWith('//') ? next : '/');
        router.refresh();
      } else if (res.status === 429 || res.status === 503) {
        setError(data.error);
      } else {
        setError('That password does not match.');
      }
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100svh] flex-col justify-end bg-ink px-6 pb-12 pt-16 sm:items-center sm:justify-center">
      <div className="w-full max-w-sm">
        <div className="eyebrow eyebrow-on">Private gallery</div>
        <h1 className="display mt-3 text-[52px]">{coupleNames}</h1>
        <p className="mt-3 text-[15px] text-ash">Enter the password from the invitation to see every photo.</p>

        <form onSubmit={handleSubmit} className="mt-8">
          <label htmlFor="pw" className="sr-only">
            Password
          </label>
          <div className="relative">
            <input
              id="pw"
              type={show ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="h-[56px] w-full rounded-full border border-veil bg-plate px-5 pr-12 text-[16px] text-paper placeholder:text-dim focus:border-accent focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center text-ash hover:text-paper"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>

          {error && (
            <p role="alert" className="mt-3 text-center text-[14px] text-[#F08A70]">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading || !password} className="btn btn-accent mt-3 h-[56px] w-full">
            {loading ? 'Opening…' : 'Open the gallery'}
          </button>
        </form>

        <p className="mt-6 text-center text-[12.5px] text-dim">Nothing here is public.</p>
      </div>
    </div>
  );
}
