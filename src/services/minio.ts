import * as Minio from 'minio';

// Default URL if not defined to avoid startup errors in unit tests, batch, etc.
export function getClient(
  endPoint: string,
  accessKey: string,
  secretKey: string,
) {
  return new Minio.Client({
    endPoint,
    useSSL: true,
    accessKey,
    secretKey,
  });
}
