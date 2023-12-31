import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

import {
  DB_FILE_STATUS,
  LOGROTATE_POSTROTATE_COMMAND,
  LOGROTATE_DIRECTORY,
  LOGROTATE_SUFFIX,
} from '../constants';
import { DatabaseService } from '../services/database.service';

export async function rotateLogs(db: DatabaseService) {
  const files = fs.readdirSync(LOGROTATE_DIRECTORY);
  const logFiles = files.filter((file) => file.endsWith(LOGROTATE_SUFFIX));
  console.log('rotate: start');
  if (logFiles.length > 0) {
    for (const file of logFiles) {
      await rotateLog(db, file);
    }
    if (LOGROTATE_POSTROTATE_COMMAND) {
      console.log('rotate: run post-rotate');
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
  } else {
    console.log('rotate: no files to rotate');
  }
  await db.bulkStatusChange(DB_FILE_STATUS.Moved, DB_FILE_STATUS.Rotated);
}

async function rotateLog(db: DatabaseService, file: string) {
  const oldPath = path.join(LOGROTATE_DIRECTORY, file);
  const newPath = path.join(LOGROTATE_DIRECTORY, newLogName(file));

  console.log(`rotate: ${oldPath} -> ${newPath}`);
  fs.renameSync(oldPath, newPath);

  // Add log to database
  await db.addLog(file, newPath);
}

// Append date to logname
export function newLogName(file: string) {
  const date = createdDate(path.join(LOGROTATE_DIRECTORY, file));
  return `${file}.${date.getUTCFullYear()}${String(date.getUTCMonth()).padStart(
    2,
    '0',
  )}${String(date.getUTCDate()).padStart(2, '0')}.${new Date().valueOf()}`;
}

function createdDate(filePath: string) {
  const { birthtime } = fs.statSync(filePath);
  return birthtime;
}
