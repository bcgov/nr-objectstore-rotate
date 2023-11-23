import { Cron } from 'croner';
import { CRON_BACKUP, CRON_ROTATE } from './constants';
import { backup } from './cron/backup';
import { DatabaseService } from './services/database.service';
import { rotateLogs } from './cron/rotate-logs';

console.log('Starting...');

async function main() {
  const db = new DatabaseService();
  await db.init();

  const backupJob = Cron(CRON_BACKUP, backup);
  const rotateJob = Cron(CRON_ROTATE, async () => {
    await rotateLogs(db);
    // await db.close();
  });

  console.log(`Backup job next run: ${backupJob.nextRun()}`);
  console.log(`Rotate job next run: ${rotateJob.nextRun()}`);
}

main();
