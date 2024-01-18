import { Cron } from 'croner';
import {
  CRON_BACKUP,
  CRON_COMPRESS,
  CRON_JANITOR,
  CRON_ROTATE,
} from './constants';
import { backup } from './cron/backup';
import { DatabaseService } from './services/database.service';
import { rotateLogs } from './cron/rotate';
import { removeOldLogs, syncLogsDb } from './cron/janitor';
import { compress } from './cron/compress';

console.log('Starting...');

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
