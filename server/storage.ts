import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const bucket = process.env.NEON_STORAGE_BUCKET || 'uploads';
const endpoint = (process.env.AWS_ENDPOINT_URL_S3 || '').replace(/\/+$/, '');

// forcePathStyle è obbligatorio: Neon Object Storage usa path-style addressing.
const s3 = new S3Client({ forcePathStyle: true });

export function storageConfigured(): boolean {
  return Boolean(endpoint && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export async function uploadObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<string> {
  if (!storageConfigured()) {
    throw new Error('Object Storage non configurato su questo branch.');
  }

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return publicUrl(key);
}

export function publicUrl(key: string): string {
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  return `${endpoint}/${bucket}/${encodedKey}`;
}
