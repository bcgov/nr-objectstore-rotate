import { RUN_ONCE } from './constants';
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

  if (RUN_ONCE) {
    await jobService.runOnce();
  } else {
    await jobService.runCron();
  }
}

main();
