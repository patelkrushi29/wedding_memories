'use client';

import { useSyncExternalStore } from 'react';

/**
 * "That's me" — the whole identity model. A guest taps their own face once and
 * the person's slug is remembered on this device. No account, no selfie, no
 * biometrics leave the phone; clearing it is one tap. Several slugs are allowed
 * because face grouping can split one person in two ("That's me too").
 */

const STORAGE_KEY = 'wedding-me';
const EMPTY: readonly string[] = [];
const listeners = new Set<() => void>();
let cache: readonly string[] | null = null;

function read(): readonly string[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    cache = Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(slugs: readonly string[]) {
  cache = slugs;
  try {
    if (slugs.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Slugs this visitor has claimed, first = primary. Empty during server render. */
export function useMe(): readonly string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function claimMe(slug: string) {
  const s = read();
  if (!s.includes(slug)) write([...s, slug]);
}

export function unclaimMe(slug: string) {
  write(read().filter((x) => x !== slug));
}

export function forgetMe() {
  write([]);
}
