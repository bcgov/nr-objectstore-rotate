import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as stream from 'stream/promises';

import { getClient } from '../services/minio';
import {
  BROKER_JWT,
  BROKER_USER,
  DB_FILE_STATUS,
  OBJECT_STORAGE_BUCKET,
  OBJECT_STORAGE_SECRET_KEY,
  VAULT_CRED_KEY,
  VAULT_CRED_PATH,
} from '../constants';
import { DatabaseService } from '../services/database.service';
import VaultService from '../broker/vault.service';
import BrokerService from '../broker/broker.service';

export async function backup(db: DatabaseService) {
  console.log('backup: start');
  const result = await db.query<{
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
    [DB_FILE_STATUS.Compressed],
  );

  if (result.rows.length === 0) {
    console.log('backup: no files to backup');
    return;
  }

  if (OBJECT_STORAGE_SECRET_KEY) {
    await backupWithSecret(db, OBJECT_STORAGE_SECRET_KEY, result);
  } else {
    const brokerService = new BrokerService(BROKER_JWT);
    const openResponse = await brokerService.open({
      event: {
        provider: 'nr-objectstore-backup',
        reason: 'Cron triggered',
      },
      actions: [
        {
          action: 'backup',
          id: 'backup',
          provision: ['token/self'],
          service: {
            name: 'vsync',
            project: 'vault',
            environment: 'production',
          },
        },
      ],
      user: {
        name: BROKER_USER,
      },
    });
    const actionToken = openResponse.actions['backup'].token;
    const vaultAccessToken = await brokerService.provisionToken(actionToken);
    const vault = new VaultService(vaultAccessToken);
    const objectStorageCreds = await vault.read(VAULT_CRED_PATH);
    const secretKey = objectStorageCreds[VAULT_CRED_KEY];
    vault.revokeToken();
    const backupFiles = await backupWithSecret(db, secretKey, result);
    for (const fileObj of backupFiles) {
      await brokerService.attachArtifact(actionToken, fileObj);
    }
    brokerService.close(true);
  }
}

async function backupWithSecret(
  db: DatabaseService,
  secret: string,
  dbResult: {
    rows: {
      id: number;
      basename: string;
      path: string;
    }[];
  },
): Promise<any[]> {
  const client = getClient(secret);
  const files = [];
  for (const row of dbResult.rows) {
    try {
      const response = await client.fPutObject(
        OBJECT_STORAGE_BUCKET,
        path.basename(row.path),
        row.path,
      );
      console.log(response);
    } catch (err) {
      const info = { file: row.path, message: err };
      console.log(info);
      continue;
    }
    db.query<{
      id: number;
      basename: string;
      path: string;
    }>(
      `
      UPDATE logs
      SET status = ?
      WHERE id = ?
      `,
      [DB_FILE_STATUS.CopiedToObjectStore, row.id],
    );
    files.push({
      checksum: `sha256:${await computeHash(row.path)}`,
      name: path.basename(row.path),
      size: fs.statSync(row.path).size,
      type: 'tgz',
    });
  }
  return files;
}

async function computeHash(filepath: string) {
  const input = fs.createReadStream(filepath);
  const hash = crypto.createHash('sha256');
  // Connect the output of the `input` stream to the input of `hash`
  // and let Node.js do the streaming
  await stream.pipeline(input, hash);

  return hash.digest('hex');
}
