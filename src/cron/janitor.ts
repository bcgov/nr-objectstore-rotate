import * as fs from 'fs/promises';

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
      const filehandle = await fs.open(row.path, 'r');
      await filehandle.close();
    } catch (err) {
      console.log(
        `janitor: delete database row ${row.id}; file missing: ${row.path}`,
      );
      try {
        await db.deleteLog(row.id);
      } catch (dbErr) {
        console.error(`Failed to delete log ${row.id}:`, dbErr);
      }
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
    nameHash[row.basename] = (nameHash[row.basename] || 0) + 1;

    if (nameHash[row.basename] > JANITOR_COPIES) {
      console.log(`Delete: ${row.path}`);
      try {
        await db.deleteLog(row.id);
        await fs.rm(row.path);
      } catch (error) {
        console.error(
          `Error deleting log ${row.id} or file ${row.path}:`,
          error,
        );
      }
    }
  }
}
