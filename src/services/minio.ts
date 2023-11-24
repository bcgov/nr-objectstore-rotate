import * as Minio from 'minio';
import {
  OBJECT_STORAGE_ACCESS_KEY,
  OBJECT_STORAGE_END_POINT,
} from '../constants';

// Default URL if not defined to avoid startup errors in unit tests, batch, etc.
export function getClient(secretKey: string) {
  return new Minio.Client({
    endPoint: OBJECT_STORAGE_END_POINT,
    useSSL: true,
    accessKey: OBJECT_STORAGE_ACCESS_KEY,
    secretKey,
  });
}
