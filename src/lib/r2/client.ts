import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_PUBLIC_BASE_URL
  );
}

export function getR2Endpoint(): string {
  if (process.env.R2_ENDPOINT) return process.env.R2_ENDPOINT;
  return `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
}

export function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: getR2Endpoint(),
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

export function publicObjectUrl(key: string): string {
  const base = process.env.R2_PUBLIC_BASE_URL!.replace(/\/$/, '');
  return `${base}/${key.replace(/^\//, '')}`;
}

/** Object keys stored in the DB (media/..., thumbnails/...) */
export function isR2ObjectKey(stored: string | null | undefined): boolean {
  if (!stored) return false;
  if (stored.startsWith('http://') || stored.startsWith('https://')) return true;
  return stored.startsWith('media/') || stored.startsWith('thumbnails/');
}

export function isLocalFilesystemPath(stored: string): boolean {
  if (stored.startsWith('/generated/')) return true;
  if (stored.includes(':\\')) return true;
  if (/^[A-Za-z]:\\/.test(stored)) return true;
  return false;
}

export async function uploadToR2(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await getR2Client().send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key.replace(/^\//, ''),
      Body: body,
      ContentType: contentType,
    })
  );
}
