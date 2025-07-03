import * as fs from 'fs/promises';
import * as path from 'path';
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
  for (const row of result) {
    const compressedFilePath = `${row.path}.tgz`;

    try {
      // Clear compressed file if it already exists
      if (await fs.stat(compressedFilePath).catch(() => false)) {
        await fs.rm(compressedFilePath);
      }

      // Check if the log file exists
      if (!(await fs.stat(row.path).catch(() => false))) {
        await db.deleteLog(row.id);
        continue;
      }

      await new Promise<void>((resolve, reject) => {
        const cmd = `tar -zcvf ${row.path}.tgz -C ${path.dirname(
          row.path,
        )} ${path.basename(row.path)}`;
        console.log(`compress: ${cmd}`);
        exec(cmd, async (error, stdout, stderr) => {
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

          try {
            await db.run(
              `
              UPDATE logs
              SET status = ?,
              path = ?
              WHERE id = ?
              `,
              [DB_FILE_STATUS.Compressed, compressedFilePath, row.id],
            );
            await fs.rm(row.path);
            resolve();
          } catch (dbError) {
            reject(dbError);
          }
        });
      });
    } catch (error) {
      console.error(`Error compressing file ${row.path}:`, error);
    }
  }
}
