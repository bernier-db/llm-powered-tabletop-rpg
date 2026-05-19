import type { DB } from '../db/database.js';
import { createLogger } from '../logger/index.js';

const log = createLogger('vector-store');

export interface SearchResult {
  id: string;
  distance: number;
}

export interface VectorStore {
  insert(id: string, embedding: number[]): void;
  search(query: number[], topK: number, filter?: Record<string, unknown>): SearchResult[];
  delete(id: string): void;
}

export function createSqliteVecStore(db: DB): VectorStore {
  function getDimension(): number | undefined {
    const row = db.prepare('SELECT value FROM db_config WHERE key = ?').get('vec_dimension') as
      | { value: string }
      | undefined;
    return row ? Number(row.value) : undefined;
  }

  function ensureTable(dim: number): void {
    const existing = getDimension();
    if (existing !== undefined) {
      if (existing !== dim) {
        log.error('dimension mismatch', { expected: existing, got: dim });
        throw new Error(`Dimension lock: store expects ${existing}, got ${dim}`);
      }
      return;
    }
    db.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS vec_embeddings USING vec0(id TEXT PRIMARY KEY, embedding float[${dim}])`);
    db.prepare('INSERT OR REPLACE INTO db_config (key, value) VALUES (?, ?)').run('vec_dimension', String(dim));
    log.info('vector table created', { dimension: dim });
  }

  return {
    insert(id, embedding) {
      const start = performance.now();
      ensureTable(embedding.length);
      db.prepare('INSERT OR REPLACE INTO vec_embeddings (id, embedding) VALUES (?, ?)').run(id, new Float32Array(embedding));
      log.debug('vector inserted', { id, ms: Math.round(performance.now() - start) });
    },

    search(query, topK) {
      const dim = getDimension();
      if (dim === undefined) return [];
      if (query.length !== dim) {
        throw new Error(`Dimension lock: store expects ${dim}, got ${query.length}`);
      }
      const start = performance.now();
      const rows = db.prepare(
        'SELECT id, distance FROM vec_embeddings WHERE embedding MATCH ? ORDER BY distance LIMIT ?',
      ).all(new Float32Array(query), topK) as SearchResult[];
      log.debug('vector search', { topK, results: rows.length, ms: Math.round(performance.now() - start) });
      return rows;
    },

    delete(id) {
      const dim = getDimension();
      if (dim === undefined) return;
      db.prepare('DELETE FROM vec_embeddings WHERE id = ?').run(id);
      log.debug('vector deleted', { id });
    },
  };
}
