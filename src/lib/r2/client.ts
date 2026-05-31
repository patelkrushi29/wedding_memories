import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';

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

export function publicObjectUrl(key: string): string | null {
  const base = process.env.R2_PUBLIC_BASE_URL?.replace(/\/$/, '');
  if (!base) return null;
  return `${base}/${key.replace(/^\//, '')}`;
}

/** True when we can build public CDN URLs (read-only; no upload keys required). */
export function isR2PublicConfigured(): boolean {
  return Boolean(process.env.R2_PUBLIC_BASE_URL);
}

/** Object keys stored in the DB (media/..., thumbnails/...) */
export function isR2ObjectKey(stored: string | null | undefined): boolean {
  if (!stored) return false;
  if (stored.startsWith('http://') || stored.startsWith('https://')) return true;
  return stored.startsWith('media/') || stored.startsWith('thumbnails/') || stored.startsWith('family-photos/');
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

export type R2ListedObject = {
  key: string;
  size: number;
  lastModified: Date;
};

/** List object keys under a prefix (paginated). Skips trailing-slash folder placeholders. */
export async function listR2Objects(prefix: string): Promise<R2ListedObject[]> {
  const normalizedPrefix = prefix.replace(/^\//, '');
  const items: R2ListedObject[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await getR2Client().send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME!,
        Prefix: normalizedPrefix,
        ContinuationToken: continuationToken,
      })
    );

    for (const obj of res.Contents ?? []) {
      if (!obj.Key || obj.Key.endsWith('/')) continue;
      items.push({
        key: obj.Key,
        size: obj.Size ?? 0,
        lastModified: obj.LastModified ?? new Date(),
      });
    }

    continuationToken = res.NextContinuationToken;
  } while (continuationToken);

  return items;
}

export async function r2ObjectExists(key: string): Promise<boolean> {
  try {
    await getR2Client().send(
      new HeadObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key.replace(/^\//, ''),
      })
    );
    return true;
  } catch (err: unknown) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.name === 'NotFound' || e.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

export async function downloadFromR2(key: string): Promise<Buffer> {
  const res = await getR2Client().send(
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key.replace(/^\//, ''),
    })
  );
  const bytes = await res.Body?.transformToByteArray();
  if (!bytes?.length) throw new Error(`Empty object: ${key}`);
  return Buffer.from(bytes);
}
