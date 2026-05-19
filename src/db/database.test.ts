import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { openDatabase } from './database.js';
import { applyMigrations } from './migrations.js';
import type { DB } from './database.js';

const MIGRATIONS_DIR = join(import.meta.dirname, '../../migrations');

describe('openDatabase', () => {
  it('opens in-memory DB with WAL mode and foreign keys', () => {
    const db = openDatabase(':memory:');
    expect(db.pragma('journal_mode', { simple: true })).toBe('memory');
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1);
    db.close();
  });

  it('loads sqlite-vec extension', () => {
    const db = openDatabase(':memory:');
    const row = db.prepare("SELECT vec_version() AS v").get() as { v: string };
    expect(row.v).toMatch(/v?\d+\.\d+/);
    db.close();
  });
});

describe('applyMigrations', () => {
  let db: DB;

  beforeEach(() => {
    db = openDatabase(':memory:');
  });

  it('applies 001-initial-schema and records version', () => {
    applyMigrations(db, MIGRATIONS_DIR);
    const versions = db.prepare('SELECT version FROM schema_version ORDER BY version').all() as { version: number }[];
    expect(versions.length).toBeGreaterThanOrEqual(1);
    expect(versions[0]!.version).toBe(1);
    db.close();
  });

  it('is idempotent — running twice does not error', () => {
    applyMigrations(db, MIGRATIONS_DIR);
    applyMigrations(db, MIGRATIONS_DIR);
    const versions = db.prepare('SELECT version FROM schema_version').all();
    expect(versions).toHaveLength(1);
    db.close();
  });

  it('creates expected tables', () => {
    applyMigrations(db, MIGRATIONS_DIR);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    ).all() as { name: string }[];
    const names = tables.map((t) => t.name);
    expect(names).toContain('actors');
    expect(names).toContain('locations');
    expect(names).toContain('npc_memories');
    expect(names).toContain('roll_log');
    expect(names).toContain('game_state');
    expect(names).toContain('turns');
    db.close();
  });
});
