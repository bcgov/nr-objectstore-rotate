import { Cron } from 'croner';
import {
  COMPRESS_SKIP,
  CRON_BACKUP,
  CRON_COMPRESS,
  CRON_JANITOR,
  CRON_ROTATE,
  MONITOR_MEMORY_USAGE,
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
    const rotateCronJob = new Cron(CRON_ROTATE, () => {
      this.rotate();
    });
    const compressCronJob = COMPRESS_SKIP
      ? null
      : new Cron(CRON_COMPRESS, () => {
          this.compress();
        });
    const backupCronJob = new Cron(CRON_BACKUP, () => {
      this.backup();
    });
    const janitorCronJob = new Cron(CRON_JANITOR, () => {
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
    if (MONITOR_MEMORY_USAGE) {
      console.log('rotate ------------ start');
      console.log(process.memoryUsage());
    }
    await rotateLogs(this.db);
    runGarbageCollection();
    if (MONITOR_MEMORY_USAGE) {
      console.log('rotate ------------ end');
      console.log(process.memoryUsage());
    }
  }

  private async compress() {
    console.log('compress ----------- start');
    if (MONITOR_MEMORY_USAGE) {
      console.log(process.memoryUsage());
    }
    await syncLogsDb(this.db);
    await compress(this.db);
    runGarbageCollection();
    if (MONITOR_MEMORY_USAGE) {
      console.log(process.memoryUsage());
    }
    console.log('compress ----------- end');
  }

  private async backup() {
    console.log('backup ------------ start');
    if (MONITOR_MEMORY_USAGE) {
      console.log(process.memoryUsage());
    }
    await syncLogsDb(this.db);
    await backup(this.db);
    runGarbageCollection();
    if (MONITOR_MEMORY_USAGE) {
      console.log(process.memoryUsage());
    }
    console.log('backup ------------ end');
  }

  private async janitor() {
    if (MONITOR_MEMORY_USAGE) {
      console.log('janitor ----------- start');
      console.log(process.memoryUsage());
    }
    await syncLogsDb(this.db);
    await removeOldLogs(this.db);
    runGarbageCollection();
    if (MONITOR_MEMORY_USAGE) {
      console.log(process.memoryUsage());
      console.log('janitor ----------- end');
    }
  }
}
