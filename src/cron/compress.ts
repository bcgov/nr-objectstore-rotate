import * as fs from 'fs';
import { exec } from 'child_process';

import { DB_FILE_STATUS } from '../constants';
import { DatabaseService } from '../services/database.service';

export async function compress(db: DatabaseService) {
  console.log('compress: start');
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
    [DB_FILE_STATUS.Rotated],
  );
  for (const row of result.rows) {
    const compressedFilePath = `${row.path}.tgz`;
    // Clear compressed file if it already exists
    if (fs.existsSync(compressedFilePath)) {
      // Remove uncompressed file
      fs.rmSync(compressedFilePath);
    }
    if (!fs.existsSync(row.path)) {
      // Delete missing log
      db.deleteLog(row.id);
      continue;
    }

    await new Promise<void>((resolve, reject) => {
      const cmd = `tar -zcvf ${row.path}.tgz ${row.path}`;
      console.log(`compress: ${cmd}`);
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          // node couldn't run the command
          reject(error);
          return;
        }
        // Using process.stdout.write to prevent double new lines.
        if (stdout) {
          process.stdout.write(`compress: [stdout] ${stdout}`);
        }
        if (stderr) {
          process.stdout.write(`compress: [stderr] ${stderr}`);
        }

        db.run(
          `
          UPDATE logs
          SET status = ?,
          path = ?
          WHERE id = ?
          `,
          [DB_FILE_STATUS.Compressed, compressedFilePath, row.id],
        );
        // Remove uncompressed file
        fs.rmSync(row.path);

        resolve();
      });
    });
  }
}
