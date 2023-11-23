import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

import {
  LOGROTATE_COPIES,
  LOGROTATE_POSTROTATE_COMMAND,
  LOGS_DIRECTORY,
  LOGS_ROTATE_SUFFIX,
} from '../constants';
import { DatabaseService } from '../services/database.service';

export async function rotateLogs(db: DatabaseService) {
  const files = fs.readdirSync(LOGS_DIRECTORY);
  const logFiles = files.filter((file) => file.endsWith(LOGS_ROTATE_SUFFIX));
  if (logFiles.length > 0) {
    for (const file of logFiles) {
      await rotateLog(db, file);
    }
    if (LOGROTATE_POSTROTATE_COMMAND) {
      console.log('Rotate: Run post-rotate');
      await new Promise<void>((resolve, reject) => {
        exec(LOGROTATE_POSTROTATE_COMMAND, (error, stdout, stderr) => {
          if (error) {
            // node couldn't run the command
            reject(error);
            return;
          }
          // Using process.stdout.write to prevent double new lines.
          if (stdout) {
            process.stdout.write(`stdout: ${stdout}`);
          }
          if (stderr) {
            process.stdout.write(`stderr: ${stderr}`);
          }
          resolve();
        });
      });
    }

    await removeOldLogs(db);
  } else {
    console.log('Rotate: No files to rotate');
  }
}

async function rotateLog(db: DatabaseService, file: string) {
  const oldPath = path.join(LOGS_DIRECTORY, file);
  const newPath = path.join(LOGS_DIRECTORY, newLogName(file));

  console.log(`Rotate: ${oldPath} -> ${newPath}`);
  fs.renameSync(oldPath, newPath);

  // Add log to database
  await db.insertValues(file, newPath, false);
}

// Append date to logname
export function newLogName(file: string) {
  const date = createdDate(path.join(LOGS_DIRECTORY, file));
  return `${file}.${date.getUTCFullYear()}${String(date.getUTCMonth()).padStart(
    2,
    '0',
  )}${String(date.getUTCDate()).padStart(2, '0')}.${new Date().valueOf()}`;
}

function createdDate(filePath: string) {
  const { birthtime } = fs.statSync(filePath);
  return birthtime;
}

async function removeOldLogs(db: DatabaseService) {
  const nameHash: { [key: string]: number } = {};
  const result = await db.query<{
    id: number;
    basename: string;
    path: string;
  }>(`
    SELECT id, basename, path
    FROM logs
    ORDER BY id DESC
    `);
  for (const row of result.rows) {
    // console.log(row);
    if (nameHash[row.basename]) {
      nameHash[row.basename]++;
    } else {
      nameHash[row.basename] = 1;
    }

    if (nameHash[row.basename] > LOGROTATE_COPIES) {
      console.log(`Delete: ${row.path}`);
      await db.query('DELETE FROM logs WHERE id = ?', [row.id]);
      fs.rmSync(row.path);
    }
  }
}
