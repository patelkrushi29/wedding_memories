import { StorageProvider } from './types';

export const localStorageProvider: StorageProvider = {
  getThumbnailUrl(asset) {
    return `/api/media/${asset.id}/thumbnail`;
  },
  getPosterUrl(asset) {
    return `/api/media/${asset.id}/thumbnail`;
  },
  getPreviewUrl(asset) {
    return `/api/media/${asset.id}/preview`;
  },
  getDownloadUrl(asset) {
    return `/api/media/${asset.id}/download`;
  },
};
