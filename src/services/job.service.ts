import { Cron } from 'croner';
import {
  COMPRESS_SKIP,
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

  public async runOnce() {
    // Stage 1: Rotate log
    await this.rotate();
    // Stage 2: Compress files - optional
    if (!COMPRESS_SKIP) {
      await this.compress();
    }
    // Stage 3: Backup
    await this.backup();
    // Stage 4: Janitor
    await this.janitor();
  }

  public async runCron() {
    const rotateCronJob = Cron(CRON_ROTATE, () => {
      this.rotate();
    });
    const compressCronJob = COMPRESS_SKIP
      ? null
      : Cron(CRON_COMPRESS, () => {
          this.compress();
        });
    const backupCronJob = Cron(CRON_BACKUP, () => {
      this.backup();
    });
    const janitorCronJob = Cron(CRON_JANITOR, () => {
      this.janitor();
    });

    console.log(`Backup job next run: ${backupCronJob.nextRun()}`);
    if (compressCronJob) {
      console.log(`Compress job next run: ${compressCronJob.nextRun()}`);
    } else {
      console.log(`Compress job next run: stage skipped`);
    }
    console.log(`Rotate job next run: ${rotateCronJob.nextRun()}`);
    console.log(`Janitor job next run: ${janitorCronJob.nextRun()}`);
  }

  private async rotate() {
    await rotateLogs(this.db);
    runGarbageCollection();
  }

  private async compress() {
    console.log('start compress');
    await syncLogsDb(this.db);
    await compress(this.db);
    runGarbageCollection();
  }

  private async backup() {
    console.log('start backup');
    await syncLogsDb(this.db);
    await backup(this.db);
    runGarbageCollection();
  }

  private async janitor() {
    await syncLogsDb(this.db);
    await removeOldLogs(this.db);
    runGarbageCollection();
  }
}
