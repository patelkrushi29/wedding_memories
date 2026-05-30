export interface StorageProvider {
  getThumbnailUrl(asset: { id: string; thumbnailPath: string | null; filename: string }): string;
  getPosterUrl(asset: { id: string; posterPath: string | null; filename: string }): string;
  getPreviewUrl(asset: { id: string; relativePath: string }): string;
  getDownloadUrl(asset: { id: string }): string;
}
