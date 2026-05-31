import 'dotenv/config';

export {
  downloadFromR2,
  isR2Configured,
  isR2ObjectKey,
  isLocalFilesystemPath,
  listR2Objects,
  r2ObjectExists,
  uploadToR2,
} from '../src/lib/r2/client';
