import * as Minio from 'minio';
import { OBJECT_STORAGE_PART_SIZE } from '../constants';

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
    partSize: OBJECT_STORAGE_PART_SIZE,
  });
}
