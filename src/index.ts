import { DatabaseService } from './services/database.service';
import { JobService } from './services/job.service';

console.log('Starting...');

async function main() {
  const db = await DatabaseService.create();
  const jobService = new JobService(db);

  if (!global.gc) {
    console.log(
      'Garbage collection unavailable. Pass --expose-gc ' +
        'when launching node to enable forced garbage collection.',
    );
  }
  const runOnce = process.env.RUN_ONCE === 'true';
  const compressEnabled = process.env.COMPRESS_ENABLED === 'true';

  jobService.run(runOnce, compressEnabled);
}

main();
