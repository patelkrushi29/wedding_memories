import { publicObjectUrl } from '@/lib/r2/client';

/** R2 key of a person's face-wall crop, written by scripts/find-faces.ts. Keyed by tag id, which never changes. */
export function faceCropKey(tagId: string): string {
  return `faces/${tagId}.webp`;
}

/** Public URL of a person's face crop; `version` busts caches when the cover face changes. */
export function faceCropUrl(tagId: string, version?: Date | string | null): string | null {
  const url = publicObjectUrl(faceCropKey(tagId));
  if (!url) return null;
  const v = version ? new Date(version).getTime() : null;
  return v ? `${url}?v=${v}` : url;
}
