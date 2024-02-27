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
  const runOnce = process.env.RUN_ONCE === 'true';
  const compressEnabled = process.env.COMPRESS_ENABLED === 'true';

  const rotateJob = async () => {
    await rotateLogs(db);
    runGarbageCollection();
  };

  const compressEnabledJob = async () => {
    await syncLogsDb(db);
    await compress(db);
    runGarbageCollection();
  };

  const backupJob = async () => {
    await syncLogsDb(db);
    await backup(db);
    runGarbageCollection();
  };

  const janitorJob = async () => {
    await syncLogsDb(db);
    await removeOldLogs(db);
    runGarbageCollection();
  };

  const combinedJob = async () => {
    // Stage 1: Rotate log
    rotateJob();

    // Stage 2: Compress files - optional
    // Stage 3: Backup - if compress enabled
    if (compressEnabled) {
      compressEnabledJob();
      backupJob();
    }

    // Stage 4: Janitor
    janitorJob();
  };

  if (runOnce) combinedJob();
  else {
    const rotateCronJob = Cron(CRON_ROTATE, rotateJob);

    if (compressEnabled) {
      const compressCronJob = Cron(CRON_COMPRESS, compressEnabledJob);
      const backupCronJob = Cron(CRON_BACKUP, backupJob);
      console.log(`Compress job next run: ${compressCronJob.nextRun()}`);
      console.log(`Backup job next run: ${backupCronJob.nextRun()}`);
    }

    const janitorCronJob = Cron(CRON_JANITOR, janitorJob);
    console.log(`Rotate job next run: ${rotateCronJob.nextRun()}`);
    console.log(`Janitor job next run: ${janitorCronJob.nextRun()}`);
  }
}

main();
