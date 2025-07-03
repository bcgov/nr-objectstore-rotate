import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

import {
  DB_FILE_STATUS,
  LOGROTATE_POSTROTATE_COMMAND,
  LOGROTATE_DIRECTORY,
  LOGROTATE_SUFFIX,
  LOGROTATE_COPYTRUNCATE_SUFFIXES,
  LOGROTATE_FILESIZE_MIN,
  LOGROTATE_AGE_MAX,
} from '../constants';
import { DatabaseService } from '../services/database.service';

export async function rotateLogs(db: DatabaseService) {
  console.log('rotate: start');

  const files = fs.readdirSync(LOGROTATE_DIRECTORY);
  const now = new Date().getTime();
  let logFiles = files.filter((file) => file.endsWith(LOGROTATE_SUFFIX));

  logFiles = logFiles.filter((file) => {
    const stats = fs.statSync(path.join(LOGROTATE_DIRECTORY, file));
    const endTime = stats.ctime.getTime() + LOGROTATE_AGE_MAX;
    const rotateFile =
      stats.size > 0 &&
      ((LOGROTATE_AGE_MAX > 0 && now > endTime) ||
        stats.size > LOGROTATE_FILESIZE_MIN);
    if (!rotateFile) {
      console.log(`rotate: ${file} (skip)`);
    }
    return rotateFile;
  });
  if (logFiles.length > 0) {
    for (const file of logFiles) {
      await rotateLog(db, file);
    }
    if (LOGROTATE_POSTROTATE_COMMAND) {
      console.log('rotate: post-rotate command [start]');
      await new Promise<void>((resolve, reject) => {
        exec(LOGROTATE_POSTROTATE_COMMAND, (error, stdout, stderr) => {
          if (error) {
            // node couldn't run the command
            console.log('rotate: command error');
            reject(error);
            return;
          }
          // Using process.stdout.write to prevent double new lines.
          if (stdout) {
            process.stdout.write(`rotate: [stdout] ${stdout}`);
          }
          if (stderr) {
            process.stdout.write(`rotate: [stderr] ${stderr}`);
          }
          resolve();
        });
      });
    }
    console.log('rotate: post-rotate command [end]');
  } else {
    console.log('rotate: no files to rotate');
  }

  try {
    await db.bulkStatusChange(DB_FILE_STATUS.Moved, DB_FILE_STATUS.Rotated);
  } catch (error) {
    console.error('Failed to update database status:', error);
  }
}

async function rotateLog(db: DatabaseService, file: string) {
  const oldPath = path.join(LOGROTATE_DIRECTORY, file);
  const newPath = path.join(LOGROTATE_DIRECTORY, newLogName(file));
  const strategy = computeRotateStrategy(file);

  console.log(`rotate: [${strategy}] ${oldPath} -> ${newPath}`);

  if (strategy === 'rename') {
    fs.renameSync(oldPath, newPath);
  } else if (strategy === 'copytruncate') {
    fs.copyFileSync(oldPath, newPath);
    fs.truncateSync(oldPath);
  }

  // Add log to database
  await db.addLog(file, newPath);
}

// Append last change time and current timestamp to logname
export function newLogName(file: string) {
  const date = changeDate(path.join(LOGROTATE_DIRECTORY, file));
  return `${file}.${date.getUTCFullYear()}${String(date.getUTCMonth()).padStart(
    2,
    '0',
  )}${String(date.getUTCDate()).padStart(2, '0')}.${new Date().valueOf()}`;
}

function changeDate(filePath: string) {
  const { ctime } = fs.statSync(filePath);
  return ctime;
}

function computeRotateStrategy(file: string) {
  for (const suffix of LOGROTATE_COPYTRUNCATE_SUFFIXES) {
    if (file.endsWith(suffix)) {
      return 'copytruncate';
    }
  }
  return 'rename';
}
