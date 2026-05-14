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