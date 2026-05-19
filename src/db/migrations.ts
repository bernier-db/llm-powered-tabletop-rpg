import { readFileSync, readdirSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DB } from './database.js';
import { createLogger } from '../logger/index.js';

const log = createLogger('migrations');

export function applyMigrations(db: DB, migrationsDir: string): void {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  const applied = new Set(
    db.prepare('SELECT version FROM schema_version').all()
      .map((r) => (r as { version: number }).version),
  );

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const match = /^(\d+)/.exec(file);
    if (!match) continue;
    const version = Number(match[1]);
    if (applied.has(version)) continue;

    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    log.info('applying migration', { version, file });

    db.transaction(() => {
      db.exec(sql);
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(version);
    })();

    log.info('migration applied', { version });
  }
}

export function backupDatabase(dbPath: string): string | null {
  if (dbPath === ':memory:') return null;
  const dest = `${dbPath}.backup-${Date.now()}`;
  try {
    copyFileSync(dbPath, dest);
    log.info('database backed up', { dest });
    return dest;
  } catch {
    log.warn('backup failed; continuing without backup', { dbPath });
    return null;
  }
}
