import { isLocalFilesystemPath, isR2Configured, isR2ObjectKey, publicObjectUrl } from '@/lib/r2/client';

type AssetForUrls = {
  id: string;
  filename: string;
  thumbnailPath: string | null;
  posterPath: string | null;
  originalPath: string;
};

function resolveMediaUrl(
  stored: string | null | undefined,
  assetId: string,
  endpoint: 'thumbnail' | 'preview' | 'download'
): string {
  if (!stored) return `/api/media/${assetId}/${endpoint}`;

  if (stored.startsWith('http://') || stored.startsWith('https://')) {
    return stored;
  }

  if (isR2Configured() && isR2ObjectKey(stored)) {
    return publicObjectUrl(stored);
  }

  if (isLocalFilesystemPath(stored)) {
    return `/api/media/${assetId}/${endpoint}`;
  }

  if (isR2Configured()) {
    return publicObjectUrl(stored);
  }

  return `/api/media/${assetId}/${endpoint}`;
}

export function thumbnailUrlFor(asset: {
  id: string;
  thumbnailPath: string | null;
  posterPath?: string | null;
}): string {
  return attachMediaUrls({
    id: asset.id,
    filename: '',
    thumbnailPath: asset.thumbnailPath,
    posterPath: asset.posterPath ?? null,
    originalPath: '',
  }).thumbnailUrl;
}

export function attachMediaUrls<T extends AssetForUrls>(
  asset: T
): Omit<T, 'originalPath' | 'thumbnailPath' | 'posterPath'> & {
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
} {
  const { originalPath, thumbnailPath, posterPath, ...rest } = asset;
  const thumbKey = thumbnailPath ?? posterPath;

  return {
    ...rest,
    thumbnailUrl: resolveMediaUrl(thumbKey, asset.id, 'thumbnail'),
    previewUrl: resolveMediaUrl(originalPath, asset.id, 'preview'),
    downloadUrl: resolveMediaUrl(originalPath, asset.id, 'download'),
  };
}
