import * as path from 'path';
import { DatabaseSync, SQLInputValue } from 'node:sqlite';
import {
  LOGROTATE_DIRECTORY,
  LOGROTATE_STATUSFILE,
  DB_FILE_STATUS,
} from '../constants';

const databasePath = path.join(LOGROTATE_DIRECTORY, LOGROTATE_STATUSFILE);

export class DatabaseService {
  private db = new DatabaseSync(databasePath);

  /**
   * Factory
   * @returns DatabaseService
   */
  static create() {
    const service = new DatabaseService();
    service.init();
    return service;
  }

  /**
   * Initializes the database
   */
  private init() {
    this.createTables();
  }

  /**
   * Creates table if it does not exist
   */
  private createTables() {
    this.db.exec(`
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
   */
  addLog(basename: string, path: string, status = DB_FILE_STATUS.Moved) {
    return this.run(
      'INSERT INTO logs (basename, path, status) VALUES (?, ?, ?)',
      [basename, path, status],
    );
  }

  /**
   * Update the status of a log
   */
  updatelogStatus(id: number, status: DB_FILE_STATUS) {
    return this.run(`UPDATE logs SET status = ? WHERE id = ?`, [status, id]);
  }

  /**
   * Bulk status change
   */
  bulkStatusChange(fromStatus: DB_FILE_STATUS, toStatus: DB_FILE_STATUS) {
    return this.run(`UPDATE logs SET status = ? WHERE status = ?`, [
      toStatus,
      fromStatus,
    ]);
  }

  /**
   * Delete log
   */
  deleteLog(id: number) {
    return this.run(`DELETE FROM logs WHERE id = ?`, [id]);
  }

  /**
   * Run SQL
   */
  run(sql: string, anonymousParameters: SQLInputValue[] = []) {
    const statment = this.db.prepare(sql);
    statment.run(...anonymousParameters);
    return Promise.resolve();
  }

  /**
   * Get all rows
   */
  all<T>(sql: string, anonymousParameters: SQLInputValue[] = []): Promise<T[]> {
    const statment = this.db.prepare(sql);
    return Promise.resolve(statment.all(...anonymousParameters) as T[]);
  }

  /**
   * Close DB
   */
  close() {
    this.db.close();
  }
}
