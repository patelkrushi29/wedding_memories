/** Shared asset shape as returned by the API (media URLs attached, internal paths stripped). */
export interface Asset {
  id: string;
  type: string; // "PHOTO" | "VIDEO"
  filename: string;
  thumbnailUrl: string;
  previewUrl: string;
  downloadUrl: string;
  fileSizeBytes: number;
  width?: number | null;
  height?: number | null;
  durationSeconds?: number | null;
  takenAt?: string | null;
  blurDataUrl?: string | null;
  album?: { title: string; slug: string } | null;
}

export interface AssetListResponse {
  items: Asset[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface AlbumSummary {
  id: string;
  title: string;
  slug: string;
  photoCount: number;
  videoCount: number;
  totalCount: number;
  coverThumbnailUrl: string | null;
}

export interface EventTag {
  id: string;
  kind: string; // "EVENT" | "LOCATION" | "PERSON" | "AUTO"
  name: string;
  slug: string;
  assetCount: number;
  coverThumbnailUrl: string | null;
  startAt?: string | null;
  endAt?: string | null;
}
