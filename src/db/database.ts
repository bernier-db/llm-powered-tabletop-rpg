import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { createLogger } from '../logger/index.js';

const log = createLogger('db');

export type DB = Database.Database;

export function openDatabase(path: string): DB {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  try {
    sqliteVec.load(db);
    log.debug('sqlite-vec loaded');
  } catch (err) {
    log.warn('sqlite-vec load failed; vector search unavailable', {
      error: String(err),
    });
  }
  log.info('database opened', { path });
  return db;
}
