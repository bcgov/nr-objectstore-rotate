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

function runGarbageCollection() {
  if (global.gc) {
    global.gc();
  }
}

async function main() {
  const db = await DatabaseService.create();

  if (!global.gc) {
    console.log(
      'Garbage collection unavailable. Pass --expose-gc ' +
        'when launching node to enable forced garbage collection.',
    );
  }

  const rotateJob = Cron(CRON_ROTATE, async () => {
    await rotateLogs(db);
    runGarbageCollection();
  });
  const compressJob = Cron(CRON_COMPRESS, async () => {
    await syncLogsDb(db);
    await compress(db);
    runGarbageCollection();
  });
  const backupJob = Cron(CRON_BACKUP, async () => {
    await syncLogsDb(db);
    await backup(db);
    runGarbageCollection();
  });
  const janitorJob = Cron(CRON_JANITOR, async () => {
    await syncLogsDb(db);
    await removeOldLogs(db);
    runGarbageCollection();
  });
  console.log(`Rotate job next run: ${rotateJob.nextRun()}`);
  console.log(`Compress job next run: ${compressJob.nextRun()}`);
  console.log(`Backup job next run: ${backupJob.nextRun()}`);
  console.log(`Janitor job next run: ${janitorJob.nextRun()}`);
}

main();
