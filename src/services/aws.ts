import { S3Client } from '@aws-sdk/client-s3';

// Default URL if not defined to avoid startup errors in unit tests, batch, etc.
export function getClient(
  endPoint: string,
  accessKey: string,
  secretKey: string,
) {
  return new S3Client({
    endpoint: endPoint,
    forcePathStyle: true,
    region: 'us-east-1',
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
}
