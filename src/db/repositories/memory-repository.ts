import type { DB } from '../database.js';
import type { ActorId, NPCMemoryId, NPCMemory } from '../../schema/index.js';

export interface MemoryRepository {
  insertMemory(memory: NPCMemory): void;
  getMemory(id: NPCMemoryId): NPCMemory | undefined;
  searchMemories(npcId: ActorId, opts?: { limit?: number; minRecall?: number }): NPCMemory[];
  decayMemories(npcId: ActorId, factor: number): number;
  deleteMemory(id: NPCMemoryId): boolean;
}

interface MemoryRow {
  id: string; npc_id: string; event_summary: string;
  valence: number; salience: number; recall_strength: number;
  related_actor_ids_json: string; pinned: number;
  ts: string; created_at: number; vector_ref: string | null;
}

function rowToMemory(r: MemoryRow): NPCMemory {
  return {
    id: r.id, npc_id: r.npc_id, event_summary: r.event_summary,
    valence: r.valence, salience: r.salience,
    recall_strength: r.recall_strength,
    related_actor_ids: JSON.parse(r.related_actor_ids_json),
    pinned: r.pinned === 1, ts: r.ts,
    created_at: r.created_at, vector_ref: r.vector_ref,
  } as NPCMemory;
}

export function createMemoryRepository(db: DB): MemoryRepository {
  return {
    insertMemory(memory) {
      db.prepare(`INSERT OR REPLACE INTO npc_memories
        (id, npc_id, event_summary, valence, salience, recall_strength,
         related_actor_ids_json, pinned, ts, created_at, vector_ref)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
        memory.id, memory.npc_id, memory.event_summary,
        memory.valence, memory.salience, memory.recall_strength,
        JSON.stringify(memory.related_actor_ids),
        memory.pinned ? 1 : 0, memory.ts,
        memory.created_at, memory.vector_ref,
      );
    },
    getMemory(id) {
      const r = db.prepare('SELECT * FROM npc_memories WHERE id = ?').get(id) as MemoryRow | undefined;
      return r ? rowToMemory(r) : undefined;
    },
    searchMemories(npcId, opts) {
      const minRecall = opts?.minRecall ?? 0;
      const limit = opts?.limit ?? 50;
      return (db.prepare(
        `SELECT * FROM npc_memories WHERE npc_id = ? AND recall_strength >= ?
         ORDER BY salience DESC, recall_strength DESC LIMIT ?`,
      ).all(npcId, minRecall, limit) as MemoryRow[]).map(rowToMemory);
    },
    decayMemories(npcId, factor) {
      const result = db.prepare(
        `UPDATE npc_memories SET recall_strength = recall_strength * ?
         WHERE npc_id = ? AND pinned = 0 AND recall_strength > 0`,
      ).run(factor, npcId);
      return result.changes;
    },
    deleteMemory(id) {
      return db.prepare('DELETE FROM npc_memories WHERE id = ?').run(id).changes > 0;
    },
  };
}
