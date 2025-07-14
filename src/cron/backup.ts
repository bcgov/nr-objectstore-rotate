import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as stream from 'stream/promises';

import { getClient } from '../services/aws';
import {
  BROKER_ENVIRONMENT,
  BROKER_JWT,
  BROKER_PROJECT,
  BROKER_ROLE_ID,
  BROKER_SERVICE,
  BROKER_USER,
  DB_FILE_STATUS,
  COMPRESS_SKIP,
  OBJECT_STORAGE_ACCESS_KEY,
  OBJECT_STORAGE_BUCKET,
  OBJECT_STORAGE_ENABLED,
  OBJECT_STORAGE_END_POINT,
  OBJECT_STORAGE_FILENAME_PREFIX,
  OBJECT_STORAGE_METADATA,
  OBJECT_STORAGE_SECRET_KEY,
  VAULT_CRED_KEYS_ACCESS_KEY,
  VAULT_CRED_KEYS_BUCKET,
  VAULT_CRED_KEYS_END_POINT,
  VAULT_CRED_KEYS_SECRET_KEY,
  VAULT_CRED_PATH,
  OBJECT_STORAGE_PART_SIZE,
} from '../constants';
import { DatabaseService } from '../services/database.service';
import VaultService from '../broker/vault.service';
import BrokerService from '../broker/broker.service';
import { PutObjectCommand } from '@aws-sdk/client-s3';

interface LogStatus {
  id: number;
  basename: string;
  path: string;
}

interface LogArtifact {
  id: number;
  checksum: string;
  name: string;
  size: number;
  type: string;
}

type FileUpdateCallback = (id: number) => Promise<any>;
const objectstorageMetadata: Record<string, string> | undefined =
  OBJECT_STORAGE_METADATA !== ''
    ? JSON.parse(OBJECT_STORAGE_METADATA)
    : undefined;

export async function backup(db: DatabaseService) {
  const dbFileStatus = COMPRESS_SKIP
    ? DB_FILE_STATUS.Rotated
    : DB_FILE_STATUS.Compressed;
  console.log('backup: start');
  const result = await db.all<{
    id: number;
    basename: string;
    path: string;
  }>(
    `
    SELECT id, basename, path
    FROM logs
    WHERE status = ?
    ORDER BY id DESC
    `,
    [dbFileStatus],
  );

  if (result.length === 0) {
    console.log('backup: no files to backup');
    return;
  }

  const fileUpdateCb: FileUpdateCallback = (id) => {
    return db.updatelogStatus(id, DB_FILE_STATUS.CopiedToObjectStore);
  };

  try {
    if (!OBJECT_STORAGE_ENABLED) {
      // Skip copy to object storage
      for (const file of result) {
        await db.updatelogStatus(file.id, DB_FILE_STATUS.CopiedToObjectStore);
      }
    } else if (BROKER_JWT === '') {
      await backupUsingEnv(result, fileUpdateCb);
    } else {
      await backupUsingBroker(BROKER_JWT, result, fileUpdateCb);
    }
  } catch (e: any) {
    // Error!
    console.log(e);
  }
}

async function backupUsingEnv(
  dbFileRows: LogStatus[],
  cb: FileUpdateCallback,
): Promise<LogArtifact[]> {
  const backupFiles = await backupWithSecret(
    dbFileRows,
    OBJECT_STORAGE_END_POINT,
    OBJECT_STORAGE_ACCESS_KEY,
    OBJECT_STORAGE_SECRET_KEY,
    OBJECT_STORAGE_BUCKET,
  );

  for (const file of backupFiles) {
    await cb(file.id);
  }
  return backupFiles;
}

async function backupUsingBroker(
  brokerJwt: string,
  dbFileRows: LogStatus[],
  cb: FileUpdateCallback,
): Promise<LogArtifact[]> {
  const brokerService = new BrokerService(brokerJwt);
  await brokerService.open({
    event: {
      provider: 'nr-objectstore-rotate-backup',
      reason: `Cron triggered for ${BROKER_SERVICE}`,
      transient: true,
    },
    actions: [
      {
        action: 'backup',
        id: 'backup',
        provision: ['token/self'],
        service: {
          name: BROKER_SERVICE,
          project: BROKER_PROJECT,
          environment: BROKER_ENVIRONMENT,
        },
      },
    ],
    user: {
      name: BROKER_USER,
    },
  });
  const vaultAccessToken = await brokerService.provisionToken(
    'backup',
    BROKER_ROLE_ID,
  );
  try {
    const vault = new VaultService(vaultAccessToken);
    const objectStorageCreds = await vault.read(VAULT_CRED_PATH);
    vault.revokeToken();
    const backupFiles = await backupWithSecret(
      dbFileRows,
      VAULT_CRED_KEYS_END_POINT === ''
        ? OBJECT_STORAGE_END_POINT
        : objectStorageCreds[VAULT_CRED_KEYS_END_POINT],
      VAULT_CRED_KEYS_ACCESS_KEY === ''
        ? OBJECT_STORAGE_ACCESS_KEY
        : objectStorageCreds[VAULT_CRED_KEYS_ACCESS_KEY],
      VAULT_CRED_KEYS_SECRET_KEY === ''
        ? OBJECT_STORAGE_SECRET_KEY
        : objectStorageCreds[VAULT_CRED_KEYS_SECRET_KEY],
      VAULT_CRED_KEYS_BUCKET === ''
        ? OBJECT_STORAGE_BUCKET
        : objectStorageCreds[VAULT_CRED_KEYS_BUCKET],
    );

    for (const file of backupFiles) {
      await brokerService.attachArtifact('backup', file);
      await cb(file.id);
    }
    brokerService.close(true);
    return backupFiles;
  } catch (e: any) {
    brokerService.close(false);
    throw e;
  }
}

async function backupWithSecret(
  dbFileRows: LogStatus[],
  endPoint: string,
  accessKey: string,
  secretKey: string,
  bucket: string,
): Promise<LogArtifact[]> {
  const client = getClient(endPoint, accessKey, secretKey);
  const files: LogArtifact[] = [];
  for (const row of dbFileRows) {
    const checksum = await computeHash(row.path);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${OBJECT_STORAGE_FILENAME_PREFIX}${path.basename(row.path)}`,
          Body: fs.createReadStream(row.path, {
            highWaterMark: OBJECT_STORAGE_PART_SIZE,
          }),
          Metadata: objectstorageMetadata ?? {},
          ChecksumAlgorithm: 'SHA256',
          ChecksumSHA256: checksum,
        }),
      );
      // console.log(response);
    } catch (err) {
      const info = { file: row.path, message: err };
      console.log(info);
      continue;
    }
    files.push({
      id: row.id,
      checksum: `sha256:${checksum}`,
      name: path.basename(row.path),
      size: fs.statSync(row.path).size,
      type: 'tgz',
    });
    console.log(`backup: Sent ${row.path} [${checksum}]`);
  }
  return files;
}

async function computeHash(filepath: string) {
  const input = fs.createReadStream(filepath, {
    highWaterMark: OBJECT_STORAGE_PART_SIZE,
  });
  const hash = crypto.createHash('sha256');
  // Connect the output of the `input` stream to the input of `hash`
  // and let Node.js do the streaming
  try {
    await stream.pipeline(input, hash);
  } finally {
    input.close(); // Ensures the stream is closed even on error
  }
  return hash.digest('hex');
}
