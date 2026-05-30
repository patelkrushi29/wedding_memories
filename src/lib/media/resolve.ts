import { isR2ObjectKey, publicObjectUrl } from '@/lib/r2/client';

/** Redirect target for preview/download/thumbnail when file is on R2 */
export function r2RedirectUrl(storedPath: string | null | undefined): string | null {
  if (!storedPath) return null;
  if (!isR2ObjectKey(storedPath)) return null;
  if (storedPath.startsWith('http://') || storedPath.startsWith('https://')) {
    return storedPath;
  }
  return publicObjectUrl(storedPath);
}
