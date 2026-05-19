import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import { createSqliteVecStore } from './vector-store.js';
import type { VectorStore, SearchResult } from './vector-store.js';
import type { EmbeddingProvider } from './embedding-provider.js';
import type { LLMProvider } from './llm-provider.js';
import type { RuleSystem, Action, ActionContext, ActionResult } from './rule-system.js';
import type { ActorId, OutcomeDegree } from '../schema/common.js';
import type { DB } from '../db/database.js';

function openTestDb(): DB {
  const db = new Database(':memory:');
  db.pragma('journal_mode = WAL');
  sqliteVec.load(db);
  db.exec('CREATE TABLE IF NOT EXISTS db_config (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
  return db;
}

describe('SqliteVecStore', () => {
  let db: DB;
  let store: VectorStore;

  beforeEach(() => {
    db = openTestDb();
    store = createSqliteVecStore(db);
  });

  it('inserts and searches vectors', () => {
    store.insert('a', [1, 0, 0]);
    store.insert('b', [0, 1, 0]);
    const results = store.search([1, 0, 0], 2);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]!.id).toBe('a');
  });

  it('enforces dimension lock on insert', () => {
    store.insert('a', [1, 0, 0]);
    expect(() => store.insert('b', [1, 0])).toThrow(/Dimension lock/);
  });

  it('enforces dimension lock on search', () => {
    store.insert('a', [1, 0, 0]);
    expect(() => store.search([1, 0], 1)).toThrow(/Dimension lock/);
  });

  it('returns empty array when no vectors exist', () => {
    const results = store.search([1, 0, 0], 5);
    expect(results).toEqual([]);
  });

  it('deletes a vector', () => {
    store.insert('a', [1, 0, 0]);
    store.insert('b', [0, 1, 0]);
    store.delete('a');
    const results = store.search([1, 0, 0], 5);
    expect(results.every((r) => r.id !== 'a')).toBe(true);
  });
});

describe('RuleSystem interface', () => {
  it('is structurally satisfiable', () => {
    const mock: RuleSystem = {
      resolveAction(action: Action, context: ActionContext): ActionResult {
        return { action, degree: 'success' as OutcomeDegree, total: 15, dc: 12, effects: ['hit'] };
      },
      calculateDC(_skill: string, _difficulty) {
        return 15;
      },
      getAvailableActions(_actorId: ActorId): Action[] {
        return [{ id: 'strike', name: 'Strike', type: 'standard', description: 'Basic attack' }];
      },
    };
    expect(mock.calculateDC('athletics', 'medium')).toBe(15);
    expect(mock.getAvailableActions('actor_1' as ActorId)).toHaveLength(1);
  });
});

describe('EmbeddingProvider interface', () => {
  it('is structurally satisfiable', () => {
    const mock: EmbeddingProvider = {
      async embed(_text) { return [0.1, 0.2]; },
      async embedBatch(texts) { return texts.map(() => [0.1, 0.2]); },
      dimensions() { return 2; },
    };
    expect(mock.dimensions()).toBe(2);
  });
});

describe('LLMProvider interface', () => {
  it('is structurally satisfiable', () => {
    const mock: LLMProvider = {
      async generate(_prompt) {
        return { text: 'hello', usage: { promptTokens: 10, completionTokens: 5 } };
      },
      async generateWithTools(_prompt, _tools) {
        return { text: '', toolCalls: [], usage: { promptTokens: 10, completionTokens: 5 } };
      },
    };
    expect(mock).toBeDefined();
  });
});
