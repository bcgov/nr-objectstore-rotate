import { Cron } from 'croner';
import {
  CRON_BACKUP,
  CRON_COMPRESS,
  CRON_JANITOR,
  CRON_ROTATE,
} from '../constants';
import { backup } from '../cron/backup';
import { rotateLogs } from '../cron/rotate';
import { removeOldLogs, syncLogsDb } from '../cron/janitor';
import { compress } from '../cron/compress';
import { DatabaseService } from './database.service';

function runGarbageCollection() {
  if (global.gc) {
    global.gc();
  }
}

export class JobService {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  rotate = async () => {
    await rotateLogs(this.db);
    runGarbageCollection();
  };

  compress = async () => {
    console.log('start compress');
    await syncLogsDb(this.db);
    await compress(this.db);
    runGarbageCollection();
  };

  backup = async () => {
    console.log('start backup');
    await syncLogsDb(this.db);
    await backup(this.db);
    runGarbageCollection();
  };

  janitor = async () => {
    await syncLogsDb(this.db);
    await removeOldLogs(this.db);
    runGarbageCollection();
  };

  private async runOnceJob(compressEnabled: boolean) {
    // Stage 1: Rotate log
    await this.rotate();
    // Stage 2: Compress files - optional
    if (compressEnabled) {
      await this.compress();
    }
    // Stage 3: Backup
    await this.backup();
    // Stage 4: Janitor
    await this.janitor();
  }

  private async cronJobs(compressEnabled: boolean) {
    const rotateCronJob = Cron(CRON_ROTATE, this.rotate);

    if (compressEnabled) {
      const compressCronJob = Cron(CRON_COMPRESS, this.compress);
      console.log(`Compress job next run: ${compressCronJob.nextRun()}`);
    }
    const backupCronJob = Cron(CRON_BACKUP, this.backup);
    const janitorCronJob = Cron(CRON_JANITOR, this.janitor);

    console.log(`Backup job next run: ${backupCronJob.nextRun()}`);
    console.log(`Rotate job next run: ${rotateCronJob.nextRun()}`);
    console.log(`Janitor job next run: ${janitorCronJob.nextRun()}`);
  }

  async run(runOnce: boolean, compressEnabled: boolean) {
    if (runOnce) this.runOnceJob(compressEnabled);
    else this.cronJobs(compressEnabled);
  }
}
