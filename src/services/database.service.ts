import * as path from 'path';
import Database from 'better-sqlite3';
import {
  LOGROTATE_DIRECTORY,
  LOGROTATE_STATUSFILE,
  DB_FILE_STATUS,
} from '../constants';

const databasePath = path.join(LOGROTATE_DIRECTORY, LOGROTATE_STATUSFILE);

export class DatabaseService {
  private db = new Database(databasePath, { fileMustExist: false });

  /**
   * Factory
   * @returns DatabaseService
   */
  static async create() {
    const service = new DatabaseService();
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
    const statement = this.db.prepare(sql);
    return Promise.resolve(statement.run(params));
  }

  all<T>(sql: string, params: any = []) {
    const statement = this.db.prepare(sql);
    return Promise.resolve(statement.all(params) as T[]);
  }

  close() {
    this.db.close();
    return Promise.resolve();
  }
}
