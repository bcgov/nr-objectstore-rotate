import * as fs from 'fs';

import { DB_FILE_STATUS, JANITOR_COPIES } from '../constants';
import { DatabaseService } from '../services/database.service';

export async function removeOldLogs(db: DatabaseService) {
  console.log('janitor: start');
  const nameHash: { [key: string]: number } = {};
  const result = await db.query<{
    id: number;
    basename: string;
    path: string;
  }>(
    `
    SELECT id, basename, path
    FROM logs
    WHERE status = ?
    ORDER BY id DESC
    `,
    [DB_FILE_STATUS.CopiedToObjectStore],
  );
  for (const row of result.rows) {
    if (nameHash[row.basename]) {
      nameHash[row.basename]++;
    } else {
      nameHash[row.basename] = 1;
    }

    if (nameHash[row.basename] > JANITOR_COPIES) {
      console.log(`Delete: ${row.path}`);
      db.deleteLog(row.id);
      fs.rmSync(row.path);
    }
  }
}
