import * as path from 'path';
import sqlite3 from 'sqlite3';
import {
  LOGROTATE_DIRECTORY,
  LOGROTATE_STATUSFILE,
  DB_FILE_STATUS,
} from '../constants';

const databasePath = path.join(LOGROTATE_DIRECTORY, LOGROTATE_STATUSFILE);

export class DatabaseService {
  private constructor(private db: sqlite3.Database) {}

  /**
   * Factory
   * @returns DatabaseService
   */
  static async create() {
    const service = await new Promise<DatabaseService>((resolve, reject) => {
      const db = new sqlite3.Database(databasePath, (error: Error | null) => {
        if (error) reject(error);
        else resolve(new DatabaseService(db));
      });
    });
    await service.init();
    return service;
  }

  /**
   * Initializes the database
   */
  async init() {
    await this.createTables();
  }

  /**
   * Creates table if it does not exist
   * @returns Promise
   */
  private async createTables() {
    await this.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      basename TEXT,
      path TEXT,
      status INT
      )
      `);
  }

  /**
   * Add log into table
   * @param basename
   * @param path
   * @param status
   * @returns
   */
  addLog(basename: string, path: string, status = DB_FILE_STATUS.Moved) {
    return this.run(
      'INSERT INTO logs (basename, path, status) VALUES (?, ?, ?)',
      [basename, path, status],
    );
  }

  /**
   * Update the status of a log
   * @param id
   * @param status
   * @returns Promise<void>
   */
  updatelogStatus(id: number, status: DB_FILE_STATUS) {
    return this.run(
      `
      UPDATE logs
      SET status = ?
      WHERE id = ?
      `,
      [status, id],
    );
  }

  bulkStatusChange(fromStatus: DB_FILE_STATUS, toStatus: DB_FILE_STATUS) {
    return this.run('UPDATE logs SET status = ? WHERE status = ?', [
      toStatus,
      fromStatus,
    ]);
  }

  /**
   * Delete log
   * @param id
   * @returns
   */
  deleteLog(id: number) {
    return this.run('DELETE FROM logs WHERE id = ?', [id]);
  }

  run(sql: string, params: any = []) {
    return new Promise<void>((resolve, reject) => {
      this.db.run(sql, params, (error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }

  all<T>(sql: string, params: any = []) {
    return new Promise<{ rows: T[] }>((resolve, reject) => {
      this.db.all<T>(sql, params, (error, rows) => {
        if (error) reject(error);
        else resolve({ rows });
      });
    });
  }

  close() {
    return new Promise<void>((resolve, reject) => {
      this.db.close((error: Error | null) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}
