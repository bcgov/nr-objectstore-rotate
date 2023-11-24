import * as path from 'path';
import sqlite3 from 'sqlite3';
import {
  LOGROTATE_DIRECTORY,
  LOGROTATE_STATUSFILE,
  DB_FILE_STATUS,
} from '../constants';

const databasePath = path.join(LOGROTATE_DIRECTORY, LOGROTATE_STATUSFILE);

export class DatabaseService {
  private db: sqlite3.Database;
  constructor() {
    this.db = new sqlite3.Database(databasePath);
  }

  async init() {
    await this.createDb();
  }

  async createDb() {
    // Create a table
    return new Promise<void>((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(
          `
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          basename TEXT,
          path TEXT,
          status INT
          )
          `,
          (error: Error | null) => {
            if (error) reject(error);
            else resolve();
          },
        );
      });
    });
  }
  // Insert data into the table
  async addLog(basename: string, path: string, status = DB_FILE_STATUS.Moved) {
    const statement = this.db.prepare(
      'INSERT INTO logs (basename, path, status) VALUES (?, ?, ?)',
    );
    statement.run(basename, path, status);
    statement.finalize();
  }

  deleteLog(id: number) {
    const statement = this.db.prepare('DELETE FROM logs WHERE id = ?');
    statement.run(id);
    statement.finalize();
  }

  async bulkStatusChange(fromStatus: DB_FILE_STATUS, toStatus: DB_FILE_STATUS) {
    const updateStatement = this.db.prepare(
      'UPDATE logs SET status = ? WHERE status = ?',
    );
    updateStatement.run(toStatus, fromStatus);
    updateStatement.finalize();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async query<T>(sql: string, params?: any) {
    return new Promise<{ rows: T[] }>((resolve, reject) => {
      this.db.all<T>(sql, params, (error, rows) => {
        if (error) reject(error);
        else resolve({ rows });
      });
    });
  }

  async close() {
    return new Promise<void>((resolve, reject) => {
      this.db.close((error: Error | null) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
