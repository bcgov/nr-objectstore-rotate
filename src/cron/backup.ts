import * as path from 'path';
import * as fs from 'fs';

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
} from '../constants';
import { DatabaseService } from '../services/database.service';
import VaultService from '../broker/vault.service';
import BrokerService from '../broker/broker.service';
import { exec } from 'child_process';

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
  const files: LogArtifact[] = [];
  for (const row of dbFileRows) {
    let checksum: string;
    try {
      checksum = await computeHash(row.path);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const response = await uploadFile(
        row.path,
        endPoint,
        accessKey,
        secretKey,
        bucket,
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

async function uploadFile(
  filepath: string,
  endPoint: string,
  accessKey: string,
  secretKey: string,
  bucket: string,
) {
  return new Promise<string>((resolve, reject) => {
    const metadata = objectstorageMetadata
      ? Object.entries(objectstorageMetadata).map((key, value) => {
          return `--metadata "${key}=${value}"`;
        })
      : '';
    const cmd = `s5cmd cp ${metadata} '${filepath}' 's3://${bucket}/${OBJECT_STORAGE_FILENAME_PREFIX}${path.basename(
      filepath,
    )}'`;
    console.log(`s3: ${cmd}`);
    exec(
      cmd,
      {
        env: {
          S3_ENDPOINT_URL: endPoint,
          AWS_ACCESS_KEY_ID: accessKey,
          AWS_SECRET_ACCESS_KEY: secretKey,
        },
      },
      async (error, stdout, stderr) => {
        if (error) {
          // node couldn't run the command
          reject(error);
          return;
        }
        // Using process.stdout.write to prevent double new lines.
        if (stdout) {
          process.stdout.write(`s3: [stdout] ${stdout}`);
        }
        if (stderr) {
          process.stdout.write(`s3: [stderr] ${stderr}`);
        }
        resolve(stdout);
      },
    );
  });
}

async function computeHash(filepath: string) {
  return new Promise<string>((resolve, reject) => {
    const cmd = `sha256sum '${filepath}'`;
    // console.log(`hash: ${cmd}`);
    exec(cmd, async (error, stdout, stderr) => {
      if (error) {
        // node couldn't run the command
        reject(error);
        return;
      }
      // Using process.stdout.write to prevent double new lines.
      if (stdout) {
        process.stdout.write(`hash: [stdout] ${stdout}`);
      }
      if (stderr) {
        process.stdout.write(`hash: [stderr] ${stderr}`);
      }
      resolve(stdout.split(' ')[0].trim());
    });
  });
}
