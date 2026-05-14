import * as Minio from 'minio';

const ENDPOINT = process.env.MINIO_ENDPOINT ?? 'localhost';
const PORT = parseInt(process.env.MINIO_PORT ?? '9000', 10);
const ACCESS_KEY = process.env.MINIO_ACCESS_KEY ?? 'minioadmin';
const SECRET_KEY = process.env.MINIO_SECRET_KEY ?? 'minioadmin';
const USE_SSL = process.env.MINIO_USE_SSL === 'true';

export const BUCKET_IMAGES = 'puzzle-images';
export const BUCKET_PIECES = 'puzzle-pieces';

export const minioClient = new Minio.Client({
  endPoint: ENDPOINT,
  port: PORT,
  useSSL: USE_SSL,
  accessKey: ACCESS_KEY,
  secretKey: SECRET_KEY,
});

export async function ensureBuckets(): Promise<void> {
  for (const bucket of [BUCKET_IMAGES, BUCKET_PIECES]) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      await minioClient.makeBucket(bucket);
      await minioClient.setBucketPolicy(bucket, JSON.stringify(getPublicPolicy(bucket)));
    }
  }
}

function getPublicPolicy(bucket: string) {
  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Principal: { AWS: ['*'] },
        Action: ['s3:GetObject'],
        Resource: [`arn:aws:s3:::${bucket}/*`],
      },
    ],
  };
}

export function getImageUrl(key: string): string {
  return `http://${ENDPOINT}:${PORT}/${BUCKET_IMAGES}/${key}`;
}

export function getPieceUrl(key: string): string {
  return `http://${ENDPOINT}:${PORT}/${BUCKET_PIECES}/${key}`;
}