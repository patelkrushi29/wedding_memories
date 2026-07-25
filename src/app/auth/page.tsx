'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function AuthPage() {
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
        router.push('/');
        router.refresh();
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
    <div className="flex min-h-screen items-center justify-center bg-ink px-6">
      <div className="w-full max-w-sm">
        {/* Aperture mark */}
        <div className="mb-9 flex justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-halide/60">
            <div className="h-3.5 w-3.5 rounded-full bg-halide" />
          </div>
        </div>

        <h1 className="display text-center text-[30px]">
          Come and <em>look</em>
        </h1>
        <p className="mono mt-3 text-center">Enter the password you were given</p>

        <form onSubmit={handleSubmit} className="mt-9">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="h-[54px] w-full rounded-card border border-veil bg-plate px-4 pr-11 text-[15px] text-paper placeholder:text-dim focus:border-halide focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-ash"
              aria-label={show ? 'Hide password' : 'Show password'}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && <p className="mono mt-3 text-center text-[#E08A6A]">{error}</p>}

          <button
            type="submit"
            disabled={loading || !password}
            className="mt-3.5 flex h-[54px] w-full items-center justify-center rounded-card bg-paper text-[15px] font-semibold text-ink transition-opacity disabled:opacity-40"
          >
            {loading ? 'Opening…' : 'Open the gallery'}
          </button>
        </form>

        <p className="mono mt-8 text-center leading-relaxed">
          Private gallery
          <br />
          Nothing here is public
        </p>
      </div>
    </div>
  );
}
