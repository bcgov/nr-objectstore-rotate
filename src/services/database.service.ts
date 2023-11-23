import * as path from 'path';
import sqlite3 from 'sqlite3';
import { LOGS_DIRECTORY, LOGROTATE_STATUSFILE } from '../constants';

const databasePath = path.join(LOGS_DIRECTORY, LOGROTATE_STATUSFILE);

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
          sync INT
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
  async insertValues(basename: string, path: string, sync: boolean) {
    const insertStatement = this.db.prepare(
      'INSERT INTO logs (basename, path, sync) VALUES (?, ?, ?)',
    );
    insertStatement.run(basename, path, sync ? 1 : 0);
    insertStatement.finalize();
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
