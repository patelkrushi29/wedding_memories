import { localStorageProvider } from './localStorageProvider';
import { r2StorageProvider } from './r2StorageProvider';
import { isR2Configured } from '@/lib/r2/client';
import type { StorageProvider } from './types';

export const storage: StorageProvider = isR2Configured()
  ? r2StorageProvider
  : localStorageProvider;

export { attachMediaUrls } from './assetUrls';
