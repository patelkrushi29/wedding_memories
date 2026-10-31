'use client';

import { useSyncExternalStore } from 'react';

/**
 * Photos picked for a post ("Add to post"). Device-only, like saves; the
 * composer at /post reads it. Capped at 10 — Instagram's carousel limit, and
 * more than a story collage can hold anyway.
 */

export const POST_LIMIT = 10;
const STORAGE_KEY = 'wedding-post-basket';
const EMPTY: readonly string[] = [];
const listeners = new Set<() => void>();
let cache: readonly string[] | null = null;

function read(): readonly string[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    cache = Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string').slice(0, POST_LIMIT) : [];
  } catch {
    cache = [];
  }
  return cache!;
}

function write(ids: readonly string[]) {
  cache = ids.slice(0, POST_LIMIT);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked: keep it for this visit.
  }
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

export function usePostBasket(): readonly string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Returns false when the basket is full. */
export function toggleInPost(id: string): boolean {
  const ids = read();
  if (ids.includes(id)) {
    write(ids.filter((x) => x !== id));
    return true;
  }
  if (ids.length >= POST_LIMIT) return false;
  write([...ids, id]);
  return true;
}

export function setPost(ids: readonly string[]) {
  write([...new Set(ids)]);
}

export function movePostItem(from: number, to: number) {
  const ids = [...read()];
  if (from < 0 || from >= ids.length || to < 0 || to >= ids.length) return;
  const [item] = ids.splice(from, 1);
  ids.splice(to, 0, item);
  write(ids);
}

export function clearPost() {
  write([]);
}
