import { Cron } from 'croner';
import {
  CRON_BACKUP,
  CRON_COMPRESS,
  CRON_JANITOR,
  CRON_ROTATE,
  OBJECT_STORAGE_ACCESS_KEY,
  OBJECT_STORAGE_BUCKET,
  OBJECT_STORAGE_END_POINT,
} from './constants';
import { backup } from './cron/backup';
import { DatabaseService } from './services/database.service';
import { rotateLogs } from './cron/rotate';
import { removeOldLogs, syncLogsDb } from './cron/janitor';
import { compress } from './cron/compress';

console.log('Starting...');

if (
  !OBJECT_STORAGE_ACCESS_KEY ||
  !OBJECT_STORAGE_END_POINT ||
  !OBJECT_STORAGE_BUCKET
) {
  console.error('Object storage url or access key not provided.');
  throw new Error(
    'OBJECT_STORAGE_END_POINT or OBJECT_STORAGE_ACCESS_ID not set',
  );
}

async function main() {
  const db = await DatabaseService.create();

  const rotateJob = Cron(CRON_ROTATE, async () => {
    await rotateLogs(db);
  });
  const compressJob = Cron(CRON_COMPRESS, async () => {
    await syncLogsDb(db);
    await compress(db);
  });
  const backupJob = Cron(CRON_BACKUP, async () => {
    await syncLogsDb(db);
    await backup(db);
  });
  const janitorJob = Cron(CRON_JANITOR, async () => {
    await syncLogsDb(db);
    await removeOldLogs(db);
  });
  console.log(`Rotate job next run: ${rotateJob.nextRun()}`);
  console.log(`Compress job next run: ${compressJob.nextRun()}`);
  console.log(`Backup job next run: ${backupJob.nextRun()}`);
  console.log(`Janitor job next run: ${janitorJob.nextRun()}`);
}

main();
