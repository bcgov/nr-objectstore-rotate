import * as fs from 'fs';

import { DB_FILE_STATUS, JANITOR_COPIES } from '../constants';
import { DatabaseService } from '../services/database.service';

export async function syncLogsDb(db: DatabaseService) {
  console.log('janitor: sync database records');
  const result = await db.all<{
    id: number;
    basename: string;
    path: string;
  }>(
    `
    SELECT id, basename, path
    FROM logs
    WHERE status >= 0
    ORDER BY id DESC
    `,
  );
  for (const row of result.rows) {
    try {
      fs.openSync(`${row.path}`, 'r');
    } catch (err) {
      console.log(
        `janitor: delete database row ${row.id}; file missing: ${row.path}`,
      );
      await db.deleteLog(row.id);
    }
  }
}

export async function removeOldLogs(db: DatabaseService) {
  console.log('janitor: start');
  const nameHash: { [key: string]: number } = {};
  const result = await db.all<{
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
      await db.deleteLog(row.id);
      fs.rmSync(row.path);
    }
  }
}
