import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import slugify from 'slugify';
import { execSync } from 'child_process';
import { prisma } from './db';
import { isLocalFilesystemPath, isR2Configured, isR2ObjectKey, uploadToR2 } from './r2';

const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.m4v', '.webm']);

const MEDIA_ROOT = process.env.MEDIA_ROOT || './media/wedding';
const THUMB_DIR = path.join(process.cwd(), 'public', 'generated', 'thumbnails');
const useR2 = isR2Configured();

function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }
  return files;
}

async function getOrCreateAlbum(title: string, relativePath: string | null, sortOrder: number) {
  const slug = slugify(title, { lower: true, strict: true });
  return prisma.album.upsert({
    where: { slug },
    update: {},
    create: { title, slug, relativePath, sortOrder },
  });
}

async function generateThumbnailLocal(srcPath: string, assetId: string): Promise<string | null> {
  try {
    fs.mkdirSync(THUMB_DIR, { recursive: true });
    const thumbPath = path.join(THUMB_DIR, `${assetId}.webp`);
    await sharp(srcPath).resize(600).webp({ quality: 80 }).toFile(thumbPath);
    return `/generated/thumbnails/${assetId}.webp`;
  } catch {
    return null;
  }
}

async function generateVideoPosterLocal(srcPath: string, assetId: string): Promise<string | null> {
  try {
    fs.mkdirSync(THUMB_DIR, { recursive: true });
    const posterPath = path.join(THUMB_DIR, `${assetId}_poster.jpg`);
    execSync(`ffmpeg -y -i "${srcPath}" -ss 00:00:01 -vframes 1 "${posterPath}" 2>/dev/null`);
    return `/generated/thumbnails/${assetId}_poster.jpg`;
  } catch {
    return null;
  }
}

function mediaObjectKey(relativePath: string): string {
  return `media/${relativePath.replace(/^\//, '')}`;
}

function thumbnailObjectKey(assetId: string): string {
  return `thumbnails/${assetId}.webp`;
}

function posterObjectKey(assetId: string): string {
  return `thumbnails/${assetId}_poster.jpg`;
}

async function uploadPhotoToR2(
  filePath: string,
  assetId: string,
  relativePath: string,
  mimeType: string
): Promise<{ originalPath: string; thumbnailPath: string | null }> {
  const mediaKey = mediaObjectKey(relativePath);
  const originalBuffer = fs.readFileSync(filePath);
  await uploadToR2(mediaKey, originalBuffer, mimeType);

  let thumbnailPath: string | null = null;
  try {
    const thumbBuffer = await sharp(filePath).resize(600).webp({ quality: 80 }).toBuffer();
    const thumbKey = thumbnailObjectKey(assetId);
    await uploadToR2(thumbKey, thumbBuffer, 'image/webp');
    thumbnailPath = thumbKey;
  } catch (err) {
    console.error(`  Thumbnail failed for ${relativePath}:`, err);
  }

  return { originalPath: mediaKey, thumbnailPath };
}

async function uploadVideoToR2(
  filePath: string,
  assetId: string,
  relativePath: string,
  mimeType: string
): Promise<{ originalPath: string; thumbnailPath: string | null; posterPath: string | null }> {
  const mediaKey = mediaObjectKey(relativePath);
  const originalBuffer = fs.readFileSync(filePath);
  await uploadToR2(mediaKey, originalBuffer, mimeType);

  let thumbnailPath: string | null = null;
  let posterPath: string | null = null;
  try {
    fs.mkdirSync(THUMB_DIR, { recursive: true });
    const localPoster = path.join(THUMB_DIR, `${assetId}_poster.jpg`);
    execSync(`ffmpeg -y -i "${filePath}" -ss 00:00:01 -vframes 1 "${localPoster}" 2>/dev/null`);
    const posterKey = posterObjectKey(assetId);
    const posterBuffer = fs.readFileSync(localPoster);
    await uploadToR2(posterKey, posterBuffer, 'image/jpeg');
    thumbnailPath = posterKey;
    posterPath = posterKey;
  } catch (err) {
    console.error(`  Video poster failed for ${relativePath}:`, err);
  }

  return { originalPath: mediaKey, thumbnailPath, posterPath };
}

async function syncMediaFiles(
  filePath: string,
  assetId: string,
  relativePath: string,
  isPhoto: boolean,
  mimeType: string
): Promise<{ originalPath: string; thumbnailPath: string | null; posterPath?: string | null }> {
  if (useR2) {
    if (isPhoto) {
      return uploadPhotoToR2(filePath, assetId, relativePath, mimeType);
    }
    return uploadVideoToR2(filePath, assetId, relativePath, mimeType);
  }

  const originalPath = filePath;
  if (isPhoto) {
    const thumbnailPath = await generateThumbnailLocal(filePath, assetId);
    return { originalPath, thumbnailPath };
  }
  const posterPath = await generateVideoPosterLocal(filePath, assetId);
  return {
    originalPath,
    thumbnailPath: posterPath,
    posterPath,
  };
}

function needsMediaSync(
  originalPath: string,
  thumbnailPath: string | null,
  isPhoto: boolean
): boolean {
  if (useR2) {
    return !isR2ObjectKey(originalPath) || !thumbnailPath || !isR2ObjectKey(thumbnailPath);
  }
  return isLocalFilesystemPath(originalPath) || !thumbnailPath;
}

async function main() {
  const mediaRoot = path.resolve(MEDIA_ROOT);
  if (!fs.existsSync(mediaRoot)) {
    fs.mkdirSync(mediaRoot, { recursive: true });
    console.log(`Created media directory: ${mediaRoot}`);
  }

  if (useR2) {
    console.log('Storage: Cloudflare R2');
  } else {
    console.log('Storage: local disk (set R2_* env vars for cloud upload)');
  }

  const allFiles = walkDir(mediaRoot);
  const mediaFiles = allFiles.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return PHOTO_EXTS.has(ext) || VIDEO_EXTS.has(ext);
  });

  console.log(`Found ${mediaFiles.length} media files`);

  let imported = 0;
  let errors = 0;

  await prisma.asset.updateMany({ data: { isAvailable: false } });

  const albumCache: Record<string, { id: string }> = {};

  for (let i = 0; i < mediaFiles.length; i++) {
    const filePath = mediaFiles[i];
    if ((i + 1) % 25 === 0 || i === mediaFiles.length - 1) {
      console.log(`Processing ${i + 1}/${mediaFiles.length}...`);
    }

    try {
      const ext = path.extname(filePath).toLowerCase();
      const isPhoto = PHOTO_EXTS.has(ext);
      const isVideo = VIDEO_EXTS.has(ext);
      const type = isPhoto ? 'PHOTO' : 'VIDEO';

      const relativePath = path.relative(mediaRoot, filePath).replace(/\\/g, '/');
      const parts = relativePath.split('/');
      const filename = parts[parts.length - 1];
      const inSubfolder = parts.length > 1;

      let albumTitle: string;
      let albumRelPath: string | null = null;
      let isHighlight = false;

      if (inSubfolder) {
        albumTitle = parts[0];
        albumRelPath = parts[0];
        if (albumTitle.toLowerCase() === 'highlights') {
          isHighlight = true;
        }
      } else {
        albumTitle = 'All Media';
      }

      const albumSlug = slugify(albumTitle, { lower: true, strict: true });
      if (!albumCache[albumSlug]) {
        const album = await getOrCreateAlbum(albumTitle, albumRelPath, inSubfolder ? 1 : 0);
        albumCache[albumSlug] = album;
      }
      const album = albumCache[albumSlug];

      const stat = fs.statSync(filePath);
      let width: number | null = null;
      let height: number | null = null;
      let takenAt: Date | null = null;

      if (isPhoto) {
        try {
          const meta = await sharp(filePath).metadata();
          width = meta.width ?? null;
          height = meta.height ?? null;
        } catch {}

        try {
          const exifr = await import('exifr');
          const parse = exifr.default?.parse ?? exifr.parse;
          const exif = await parse(filePath, ['DateTimeOriginal']);
          if (exif?.DateTimeOriginal) takenAt = new Date(exif.DateTimeOriginal);
        } catch {}
      }

      const mimeType = isPhoto
        ? `image/${ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1)}`
        : `video/${ext.slice(1)}`;

      const existing = await prisma.asset.findUnique({ where: { relativePath } });
      let assetId = existing?.id;

      if (!assetId) {
        const created = await prisma.asset.create({
          data: {
            type,
            albumId: album.id,
            filename,
            originalPath: filePath,
            relativePath,
            extension: ext.slice(1),
            mimeType,
            fileSizeBytes: stat.size,
            width,
            height,
            takenAt,
            modifiedAt: stat.mtime,
            isHighlight,
            isAvailable: true,
          },
        });
        assetId = created.id;
      } else {
        await prisma.asset.update({
          where: { id: assetId },
          data: {
            isAvailable: true,
            modifiedAt: stat.mtime,
            albumId: album.id,
            filename,
            fileSizeBytes: stat.size,
            width,
            height,
            takenAt,
          },
        });
      }

      const current = await prisma.asset.findUnique({ where: { id: assetId } });
      if (
        current &&
        needsMediaSync(current.originalPath, current.thumbnailPath, isPhoto)
      ) {
        const synced = await syncMediaFiles(filePath, assetId, relativePath, isPhoto, mimeType);
        await prisma.asset.update({
          where: { id: assetId },
          data: {
            originalPath: synced.originalPath,
            thumbnailPath: synced.thumbnailPath,
            posterPath: synced.posterPath ?? synced.thumbnailPath,
          },
        });
      }

      imported++;
    } catch (err) {
      console.error(`Error processing ${filePath}:`, err);
      errors++;
    }
  }

  const missing = await prisma.asset.count({ where: { isAvailable: false } });
  console.log(`\nImport complete:`);
  console.log(`  Imported/updated: ${imported}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Missing files marked unavailable: ${missing}`);

  await prisma.$disconnect();
}

main().catch(console.error);
