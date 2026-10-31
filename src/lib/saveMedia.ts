/**
 * Getting a photograph onto someone's device.
 *
 * Two traps this exists to avoid:
 *  1. `<a href download>` is ignored for cross-origin URLs, and the originals are
 *     served from r2.dev — so the old Download button just opened the image in a
 *     new tab. Fetching the bytes and downloading a same-origin blob fixes that.
 *  2. On iOS the only route from the web into the Photos app is the share sheet
 *     (`navigator.share({ files })` → "Save Image"). A plain download lands in Files.
 *
 * Fetching from R2 needs a CORS rule on the bucket allowing GET from the site's
 * origin (see docs/DEPLOY.md). Without it we fall back to opening the file.
 */

export type SaveOutcome = 'shared' | 'downloaded' | 'opened' | 'cancelled' | 'needs-tap';

/** Touch devices with a share sheet that accepts files — in practice iOS and Android. */
export function prefersShareSheet(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches;
  return Boolean(coarse && 'share' in navigator && 'canShare' in navigator);
}

function mimeFor(filename: string, fallback: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
  };
  return (ext && map[ext]) || fallback || 'application/octet-stream';
}

export async function fetchAsFile(url: string, filename: string): Promise<File> {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  return new File([blob], filename, { type: mimeFor(filename, blob.type) });
}

function downloadFile(file: File) {
  const href = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = href;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

/** Open the share sheet for an already-fetched file. Call from a tap handler. */
export async function shareFile(file: File): Promise<SaveOutcome> {
  try {
    await navigator.share({ files: [file] });
    return 'shared';
  } catch (err) {
    const name = (err as DOMException)?.name;
    if (name === 'AbortError') return 'cancelled';
    // Safari drops the user gesture if the fetch took too long. The caller keeps
    // the file and asks for a second tap, which is a fresh gesture.
    if (name === 'NotAllowedError') return 'needs-tap';
    throw err;
  }
}

/**
 * Save one item. Returns what happened so the button can say so.
 * `file` lets the caller pass bytes it already fetched (the second-tap path).
 */
export async function saveMedia(
  url: string,
  filename: string,
  file?: File
): Promise<{ outcome: SaveOutcome; file?: File }> {
  let fetched = file;
  try {
    fetched ??= await fetchAsFile(url, filename);
  } catch {
    // Most likely a missing CORS rule on the bucket. Still give them the photo.
    window.open(url, '_blank', 'noopener');
    return { outcome: 'opened' };
  }

  if (prefersShareSheet() && navigator.canShare?.({ files: [fetched] })) {
    const outcome = await shareFile(fetched);
    return { outcome, file: fetched };
  }

  downloadFile(fetched);
  return { outcome: 'downloaded', file: fetched };
}
