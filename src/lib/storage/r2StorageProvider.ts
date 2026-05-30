import { isR2ObjectKey, publicObjectUrl } from '@/lib/r2/client';
import type { StorageProvider } from './types';

function urlFromStored(
  stored: string | null | undefined,
  assetId: string,
  endpoint: 'thumbnail' | 'preview' | 'download'
): string {
  if (!stored) return `/api/media/${assetId}/${endpoint}`;
  if (stored.startsWith('http://') || stored.startsWith('https://')) return stored;
  if (isR2ObjectKey(stored)) return publicObjectUrl(stored);
  return `/api/media/${assetId}/${endpoint}`;
}

export const r2StorageProvider: StorageProvider = {
  getThumbnailUrl(asset) {
    return urlFromStored(asset.thumbnailPath, asset.id, 'thumbnail');
  },
  getPosterUrl(asset) {
    return urlFromStored(asset.posterPath ?? asset.thumbnailPath, asset.id, 'thumbnail');
  },
  getPreviewUrl(asset) {
    return urlFromStored(asset.originalPath, asset.id, 'preview');
  },
  getDownloadUrl(asset) {
    return urlFromStored(asset.originalPath, asset.id, 'download');
  },
};
