/**
 * Index media already stored in R2 (bucket prefix `media/`) into Postgres.
 * Does not read MEDIA_ROOT or any local wedding folder.
 *
 * Usage: npm run sync:r2
 * Optional: npm run sync:r2 -- --skip-thumbnails  (DB rows only; grids need thumbs later)
 */
import 'dotenv/config';
import * as path from 'path';
import sharp from 'sharp';
import slugify from 'slugify';
import { prisma } from './db';
import {
  downloadFromR2,
  isR2Configured,
  isR2ObjectKey,
  listR2Objects,
  r2ObjectExists,
  uploadToR2,
} from './r2';

const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.m4v', '.webm']);
const MEDIA_PREFIX = 'family-photos/media/';

const skipThumbnails = process.argv.includes('--skip-thumbnails');

function parseAlbum(relativePath: string): {
  albumTitle: string;
  albumRelPath: string | null;
  isHighlight: boolean;
  inSubfolder: boolean;
} {
  const parts = relativePath.split('/');
  const inSubfolder = parts.length > 1;

  if (inSubfolder) {
    const albumTitle = parts[0];
    return {
      albumTitle,
      albumRelPath: parts[0],
      isHighlight: albumTitle.toLowerCase() === 'highlights',
      inSubfolder: true,
    };
  }

  return {
    albumTitle: 'All Media',
    albumRelPath: null,
    isHighlight: false,
    inSubfolder: false,
  };
}

async function getOrCreateAlbum(
  title: string,
  relativePath: string | null,
  sortOrder: number
) {
  const slug = slugify(title, { lower: true, strict: true });
  return prisma.album.upsert({
    where: { slug },
    update: {},
    create: { title, slug, relativePath, sortOrder },
  });
}

function thumbnailObjectKey(assetId: string): string {
  return `thumbnails/${assetId}.webp`;
}

function posterObjectKey(assetId: string): string {
  return `thumbnails/${assetId}_poster.jpg`;
}

async function ensurePhotoThumbnail(
  assetId: string,
  mediaKey: string
): Promise<{ thumbKey: string; created: boolean; width: number | null; height: number | null }> {
  const thumbKey = thumbnailObjectKey(assetId);
  if (await r2ObjectExists(thumbKey)) {
    return { thumbKey, created: false, width: null, height: null };
  }

  const buffer = await downloadFromR2(mediaKey);
  const meta = await sharp(buffer).metadata();
  const thumbBuffer = await sharp(buffer).resize(600).webp({ quality: 80 }).toBuffer();
  await uploadToR2(thumbKey, thumbBuffer, 'image/webp');
  return {
    thumbKey,
    created: true,
    width: meta.width ?? null,
    height: meta.height ?? null,
  };
}

async function resolveVideoThumbnail(assetId: string): Promise<{
  thumbnailPath: string | null;
  posterPath: string | null;
}> {
  const posterKey = posterObjectKey(assetId);
  if (await r2ObjectExists(posterKey)) {
    return { thumbnailPath: posterKey, posterPath: posterKey };
  }
  return { thumbnailPath: null, posterPath: null };
}

async function main() {
  if (!isR2Configured()) {
    console.error(
      'R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_BASE_URL in .env'
    );
    process.exit(1);
  }

  const bucket = process.env.R2_BUCKET_NAME;
  console.log(`Syncing from R2 bucket "${bucket}" prefix "${MEDIA_PREFIX}"`);
  if (skipThumbnails) console.log('(--skip-thumbnails: not generating missing thumbnails)');

  const objects = await listR2Objects(MEDIA_PREFIX);
  const mediaObjects = objects.filter((obj) => {
    const ext = path.extname(obj.key).toLowerCase();
    return PHOTO_EXTS.has(ext) || VIDEO_EXTS.has(ext);
  });

  console.log(`Found ${mediaObjects.length} media objects in R2`);

  let indexed = 0;
  let errors = 0;
  let thumbsCreated = 0;

  await prisma.asset.updateMany({ data: { isAvailable: false } });

  const albumCache: Record<string, { id: string }> = {};

  for (let i = 0; i < mediaObjects.length; i++) {
    const { key: mediaKey, size, lastModified } = mediaObjects[i];
    if ((i + 1) % 50 === 0 || i === mediaObjects.length - 1) {
      console.log(`Processing ${i + 1}/${mediaObjects.length}...`);
    }

    try {
      if (!mediaKey.startsWith(MEDIA_PREFIX)) continue;

      const relativePath = mediaKey.slice(MEDIA_PREFIX.length);
      const ext = path.extname(relativePath).toLowerCase();
      const isPhoto = PHOTO_EXTS.has(ext);
      const isVideo = VIDEO_EXTS.has(ext);
      const type = isPhoto ? 'PHOTO' : 'VIDEO';
      const filename = path.basename(relativePath);
      const { albumTitle, albumRelPath, isHighlight, inSubfolder } =
        parseAlbum(relativePath);

      const albumSlug = slugify(albumTitle, { lower: true, strict: true });
      if (!albumCache[albumSlug]) {
        const album = await getOrCreateAlbum(
          albumTitle,
          albumRelPath,
          inSubfolder ? 1 : 0
        );
        albumCache[albumSlug] = album;
      }
      const album = albumCache[albumSlug];

      const mimeType = isPhoto
        ? `image/${ext.slice(1) === 'jpg' ? 'jpeg' : ext.slice(1)}`
        : `video/${ext.slice(1)}`;

      let width: number | null = null;
      let height: number | null = null;

      const existing = await prisma.asset.findUnique({ where: { relativePath } });
      let assetId = existing?.id;

      if (!assetId) {
        const created = await prisma.asset.create({
          data: {
            type,
            albumId: album.id,
            filename,
            originalPath: mediaKey,
            relativePath,
            extension: ext.slice(1),
            mimeType,
            fileSizeBytes: size,
            width,
            height,
            modifiedAt: lastModified,
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
            originalPath: mediaKey,
            albumId: album.id,
            filename,
            fileSizeBytes: size,
            modifiedAt: lastModified,
            isHighlight,
          },
        });
      }

      if (!skipThumbnails) {
        const current = await prisma.asset.findUnique({ where: { id: assetId } });
        let thumbnailPath = current?.thumbnailPath ?? null;
        let posterPath = current?.posterPath ?? null;

        const needsThumb =
          !thumbnailPath ||
          !isR2ObjectKey(thumbnailPath) ||
          !(await r2ObjectExists(thumbnailPath));

        if (isPhoto && needsThumb) {
          const thumb = await ensurePhotoThumbnail(assetId, mediaKey);
          thumbnailPath = thumb.thumbKey;
          if (thumb.created) thumbsCreated++;
          if (thumb.width != null) {
            width = thumb.width;
            height = thumb.height;
          }
        } else if (isVideo && needsThumb) {
          const videoThumbs = await resolveVideoThumbnail(assetId);
          thumbnailPath = videoThumbs.thumbnailPath;
          posterPath = videoThumbs.posterPath;
          if (!thumbnailPath) {
            console.warn(
              `  No poster in R2 for video ${relativePath} (upload ${posterObjectKey(assetId)} manually)`
            );
          }
        }

        await prisma.asset.update({
          where: { id: assetId },
          data: {
            ...(thumbnailPath ? { thumbnailPath } : {}),
            ...(isVideo && posterPath ? { posterPath } : {}),
            ...(width != null && height != null ? { width, height } : {}),
          },
        });
      }

      indexed++;
    } catch (err) {
      console.error(`Error indexing ${mediaKey}:`, err);
      errors++;
    }
  }

  const missing = await prisma.asset.count({ where: { isAvailable: false } });
  console.log('\nR2 sync complete:');
  console.log(`  Indexed/updated: ${indexed}`);
  console.log(`  Thumbnails created/uploaded: ${thumbsCreated}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  DB rows marked unavailable (no longer in R2): ${missing}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
