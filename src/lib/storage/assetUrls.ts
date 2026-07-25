import { isLocalFilesystemPath, isR2ObjectKey, isR2PublicConfigured, publicObjectUrl } from '@/lib/r2/client';

type AssetForUrls = {
  id: string;
  filename: string;
  thumbnailPath: string | null;
  viewerPath?: string | null;
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

  if (isR2PublicConfigured() && isR2ObjectKey(stored)) {
    const url = publicObjectUrl(stored);
    if (url) return url;
  }

  if (isLocalFilesystemPath(stored)) {
    return `/api/media/${assetId}/${endpoint}`;
  }

  if (isR2PublicConfigured() && stored) {
    const url = publicObjectUrl(stored);
    if (url) return url;
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

/**
 * Attach delivery URLs and strip internal keys.
 *
 * Three tiers, per the delivery notes: `thumbnailUrl` for grids, `previewUrl`
 * for the viewer (mid-size render — never the original), and `fullUrl` for a
 * deliberate full-resolution fetch (pinch-zoom, download).
 */
export function attachMediaUrls<T extends AssetForUrls>(
  asset: T
): Omit<T, 'originalPath' | 'thumbnailPath' | 'posterPath' | 'viewerPath'> & {
  thumbnailUrl: string;
  previewUrl: string;
  fullUrl: string;
  downloadUrl: string;
} {
  const { originalPath, thumbnailPath, posterPath, viewerPath, ...rest } = asset;
  const thumbKey = thumbnailPath ?? posterPath;

  return {
    ...rest,
    thumbnailUrl: resolveMediaUrl(thumbKey, asset.id, 'thumbnail'),
    // Videos have no viewer render — they stream from the original.
    previewUrl: resolveMediaUrl(viewerPath ?? originalPath, asset.id, 'preview'),
    fullUrl: resolveMediaUrl(originalPath, asset.id, 'preview'),
    downloadUrl: resolveMediaUrl(originalPath, asset.id, 'download'),
  };
}
