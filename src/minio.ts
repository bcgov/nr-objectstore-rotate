import * as Minio from 'minio';

// Default URL if not defined to avoid startup errors in unit tests, batch, etc.
export function getClient(objectStorageSecret: string) {
  if (
    !process.env.OBJECT_STORAGE_ACCESS_KEY ||
    !process.env.OBJECT_STORAGE_URL
  ) {
    console.error('Object storage url or access key not provided.');
    throw new Error('OBJECT_STORAGE_URL or OBJECT_STORAGE_ACCESS_ID not set');
  }

  return new Minio.Client({
    endPoint: process.env.OBJECT_STORAGE_URL,
    port: 9000,
    useSSL: true,
    accessKey: process.env.OBJECT_STORAGE_ACCESS_KEY,
    secretKey: objectStorageSecret,
  });
}
