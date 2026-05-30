import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import slugify from 'slugify';
import { execSync } from 'child_process';
import { prisma } from './db';

const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.m4v', '.webm']);

const MEDIA_ROOT = process.env.MEDIA_ROOT || './media/wedding';
const THUMB_DIR = path.join(process.cwd(), 'public', 'generated', 'thumbnails');

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

async function generateThumbnail(srcPath: string, assetId: string): Promise<string | null> {
  try {
    fs.mkdirSync(THUMB_DIR, { recursive: true });
    const thumbPath = path.join(THUMB_DIR, `${assetId}.webp`);
    await sharp(srcPath).resize(600).webp({ quality: 80 }).toFile(thumbPath);
    return `/generated/thumbnails/${assetId}.webp`;
  } catch {
    return null;
  }
}

async function generateVideoPoster(srcPath: string, assetId: string): Promise<string | null> {
  try {
    const posterPath = path.join(THUMB_DIR, `${assetId}_poster.jpg`);
    execSync(`ffmpeg -y -i "${srcPath}" -ss 00:00:01 -vframes 1 "${posterPath}" 2>/dev/null`);
    return `/generated/thumbnails/${assetId}_poster.jpg`;
  } catch {
    return null;
  }
}

async function main() {
  const mediaRoot = path.resolve(MEDIA_ROOT);
  if (!fs.existsSync(mediaRoot)) {
    fs.mkdirSync(mediaRoot, { recursive: true });
    console.log(`Created media directory: ${mediaRoot}`);
  }

  const allFiles = walkDir(mediaRoot);
  const mediaFiles = allFiles.filter((f) => {
    const ext = path.extname(f).toLowerCase();
    return PHOTO_EXTS.has(ext) || VIDEO_EXTS.has(ext);
  });

  console.log(`Found ${mediaFiles.length} media files`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Mark all existing assets as unavailable first
  await prisma.asset.updateMany({ data: { isAvailable: false } });

  const albumCache: Record<string, { id: string }> = {};

  for (const filePath of mediaFiles) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const isPhoto = PHOTO_EXTS.has(ext);
      const isVideo = VIDEO_EXTS.has(ext);
      const type = isPhoto ? 'PHOTO' : 'VIDEO';

      const relativePath = path.relative(mediaRoot, filePath).replace(/\\/g, '/');
      const parts = relativePath.split('/');
      const filename = parts[parts.length - 1];
      const inSubfolder = parts.length > 1;

      // Determine album
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
            mimeType: isPhoto ? `image/${ext.slice(1)}` : `video/${ext.slice(1)}`,
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
          data: { isAvailable: true, modifiedAt: stat.mtime, albumId: album.id },
        });
      }

      // Generate thumbnail
      const asset = await prisma.asset.findUnique({ where: { id: assetId } });
      if (asset && !asset.thumbnailPath) {
        if (isPhoto) {
          const thumbPath = await generateThumbnail(filePath, assetId);
          if (thumbPath) {
            await prisma.asset.update({ where: { id: assetId }, data: { thumbnailPath: thumbPath } });
          }
        } else if (isVideo) {
          const posterPath = await generateVideoPoster(filePath, assetId);
          if (posterPath) {
            await prisma.asset.update({ where: { id: assetId }, data: { posterPath, thumbnailPath: posterPath } });
          }
        }
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
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Missing files marked unavailable: ${missing}`);

  await prisma.$disconnect();
}

main().catch(console.error);
