'use client';

import { useSyncExternalStore } from 'react';

/**
 * Private saves — the heart. Lives only in this browser's localStorage; nothing
 * is sent to the server or shown to anyone else.
 *
 * One store instead of each heart reading localStorage in its own effect, so a
 * heart in the viewer, the Saved page and another open tab all agree instantly.
 */

const STORAGE_KEY = 'wedding-gallery-selected-assets';
const EMPTY: readonly string[] = [];
const listeners = new Set<() => void>();
let cache: readonly string[] | null = null;

function read(): readonly string[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    // Private mode or a corrupted value — behave as "nothing saved".
    cache = [];
  }
  return cache!;
}

function write(ids: readonly string[]) {
  cache = ids;
  try {
    if (ids.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage full or blocked: keep the in-memory copy for this visit.
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

/** All saved ids, oldest first. Empty during server render. */
export function useSavedIds(): readonly string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useIsSaved(id: string): boolean {
  return useSavedIds().includes(id);
}

export function toggleSaved(id: string) {
  const ids = read();
  write(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);
}

export function removeSaved(idsToRemove: readonly string[]) {
  const drop = new Set(idsToRemove);
  write(read().filter((x) => !drop.has(x)));
}

export function clearSaved() {
  write([]);
}
