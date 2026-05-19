import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { openDatabase } from './database.js';
import { applyMigrations } from './migrations.js';
import { createCampaignRepository } from './repositories/campaign-repository.js';
import { createSessionRepository } from './repositories/session-repository.js';
import { createMemoryRepository } from './repositories/memory-repository.js';
import { createAuditRepository } from './repositories/audit-repository.js';
import type { DB } from './database.js';

const MIGRATIONS_DIR = join(import.meta.dirname, '../../migrations');

function freshDb(): DB {
  const db = openDatabase(':memory:');
  applyMigrations(db, MIGRATIONS_DIR);
  return db;
}

describe('CampaignRepository', () => {
  let db: DB;

  beforeEach(() => { db = freshDb(); });

  it('inserts and retrieves an actor with JSON round-trip', () => {
    const sheet = { hp_current: 20, hp_max: 20, ac: 15, level: 1, archetype: 'Fighter', ability_scores: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, saves: { fort: 4, ref: 1, will: 0 }, speed: 25, actions_remaining: 3, conditions: [], skills: { athletics: 5 } };
    db.prepare(`INSERT INTO actors (id, name, controller, sheet_json, is_player_character)
      VALUES (?, ?, ?, ?, ?)`).run('pc-aryn', 'Aryn', 'human', JSON.stringify(sheet), 1);

    const repo = createCampaignRepository(db);
    const actor = repo.getActor('pc-aryn' as any);
    expect(actor).toBeDefined();
    expect(actor!.name).toBe('Aryn');
    expect(actor!.sheet.hp_current).toBe(20);
    expect(actor!.is_player_character).toBe(true);
    db.close();
  });

  it('lists actors', () => {
    const sheet = JSON.stringify({ hp_current: 10, hp_max: 10, ac: 12, level: 1, archetype: 'Rogue', ability_scores: { str: 10, dex: 16, con: 12, int: 14, wis: 10, cha: 10 }, saves: { fort: 1, ref: 4, will: 0 }, speed: 30, actions_remaining: 3, conditions: [], skills: {} });
    db.prepare('INSERT INTO actors (id, name, controller, sheet_json, is_player_character) VALUES (?, ?, ?, ?, ?)').run('npc-marta', 'Marta', 'dm', sheet, 0);
    db.prepare('INSERT INTO actors (id, name, controller, sheet_json, is_player_character) VALUES (?, ?, ?, ?, ?)').run('npc-gorm', 'Gorm', 'dm', sheet, 0);

    const repo = createCampaignRepository(db);
    expect(repo.listActors()).toHaveLength(2);
    db.close();
  });

  it('returns undefined for missing actor', () => {
    const repo = createCampaignRepository(db);
    expect(repo.getActor('nonexistent' as any)).toBeUndefined();
    db.close();
  });

  it('inserts and retrieves a location', () => {
    db.prepare(`INSERT INTO locations (id, name, type, description) VALUES (?, ?, ?, ?)`)
      .run('loc-inn', 'The Drunken Goose', 'building', 'A well-worn tavern.');

    const repo = createCampaignRepository(db);
    const loc = repo.getLocation('loc-inn' as any);
    expect(loc).toBeDefined();
    expect(loc!.name).toBe('The Drunken Goose');
    expect(loc!.type).toBe('building');
    db.close();
  });

  it('inserts and retrieves a relationship', () => {
    db.prepare(`INSERT INTO relationships (id, subject_id, subject_kind, object_id, object_kind, relation_type, is_public, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run('rel-1', 'npc-a', 'actor', 'npc-b', 'actor', 'friendship', 1, Date.now());

    const repo = createCampaignRepository(db);
    const rel = repo.getRelationship('rel-1' as any);
    expect(rel).toBeDefined();
    expect(rel!.relation_type).toBe('friendship');
    expect(rel!.is_public).toBe(true);

    const rels = repo.listRelationships('npc-a');
    expect(rels).toHaveLength(1);
    db.close();
  });
});

describe('SessionRepository', () => {
  let db: DB;

  beforeEach(() => { db = freshDb(); });

  it('saves and retrieves game state', () => {
    const repo = createSessionRepository(db);
    const state = {
      id: 'current', campaign_id: 'camp-1', session_id: 'sess-1',
      current_scene_id: null, turn_number: 0,
      world_time: 'Day 1, morning', state_json: '{}', updated_at: Date.now(),
    };
    repo.saveGameState(state);
    const loaded = repo.getGameState();
    expect(loaded).toBeDefined();
    expect(loaded!.campaign_id).toBe('camp-1');
    expect(loaded!.world_time).toBe('Day 1, morning');
    db.close();
  });

  it('upserts game state on second save', () => {
    db.prepare(`INSERT INTO locations (id, name, type, description) VALUES (?, ?, ?, ?)`).run('loc-1', 'Test', 'room', '');
    db.prepare(`INSERT INTO scenes (id, location_id, opened_at) VALUES (?, ?, ?)`).run('sc-1', 'loc-1', Date.now());
    const repo = createSessionRepository(db);
    const now = Date.now();
    repo.saveGameState({ id: 'current', campaign_id: 'c', session_id: 's', current_scene_id: null, turn_number: 0, world_time: null, state_json: '{}', updated_at: now });
    repo.saveGameState({ id: 'current', campaign_id: 'c', session_id: 's', current_scene_id: 'sc-1', turn_number: 5, world_time: 'Day 2', state_json: '{"x":1}', updated_at: now + 1 });
    const loaded = repo.getGameState();
    expect(loaded!.turn_number).toBe(5);
    db.close();
  });

  it('adds and retrieves turns', () => {
    db.prepare(`INSERT INTO locations (id, name, type, description) VALUES (?, ?, ?, ?)`).run('loc-1', 'Test', 'room', '');
    db.prepare(`INSERT INTO scenes (id, location_id, opened_at) VALUES (?, ?, ?)`).run('sc-1', 'loc-1', Date.now());

    const repo = createSessionRepository(db);
    const entry = {
      entry_id: 't-1', scene_id: 'sc-1', turn_index: 0,
      speaker_id: 'pc-aryn', speaker_role: 'player' as const,
      text: 'I search the room.', world_time: 'Day 1',
      wall_time: Date.now(),
      contains_roll_outcome: false, contains_entity_introduction: false,
      contains_decision: true, contains_emotional_beat: false,
    };
    repo.addTurn('sess-1' as any, entry as any);
    const turns = repo.getTurns('sess-1' as any, 'sc-1' as any);
    expect(turns).toHaveLength(1);
    expect(turns[0]!.text).toBe('I search the room.');
    expect(turns[0]!.contains_decision).toBe(true);
    db.close();
  });
});

describe('MemoryRepository', () => {
  let db: DB;

  beforeEach(() => {
    db = freshDb();
    db.prepare(`INSERT INTO actors (id, name, controller, sheet_json, is_player_character)
      VALUES (?, ?, ?, ?, ?)`).run('npc-marta', 'Marta', 'dm', '{}', 0);
  });

  const baseMemory = {
    id: 'mem-1', npc_id: 'npc-marta', event_summary: 'Party helped me',
    valence: 2, salience: 7, recall_strength: 1.0,
    related_actor_ids: ['pc-aryn'], pinned: false,
    ts: 'Day 1', created_at: Date.now(), vector_ref: null,
  };

  it('inserts and retrieves a memory', () => {
    const repo = createMemoryRepository(db);
    repo.insertMemory(baseMemory as any);
    const mem = repo.getMemory('mem-1' as any);
    expect(mem).toBeDefined();
    expect(mem!.event_summary).toBe('Party helped me');
    expect(mem!.related_actor_ids).toEqual(['pc-aryn']);
    db.close();
  });

  it('searches memories by npc_id with recall filter', () => {
    const repo = createMemoryRepository(db);
    repo.insertMemory(baseMemory as any);
    repo.insertMemory({ ...baseMemory, id: 'mem-2', recall_strength: 0.1, salience: 3, event_summary: 'Fading' } as any);

    const strong = repo.searchMemories('npc-marta' as any, { minRecall: 0.5 });
    expect(strong).toHaveLength(1);
    expect(strong[0]!.id).toBe('mem-1');

    const all = repo.searchMemories('npc-marta' as any);
    expect(all).toHaveLength(2);
    db.close();
  });

  it('decays non-pinned memories', () => {
    const repo = createMemoryRepository(db);
    repo.insertMemory(baseMemory as any);
    repo.insertMemory({ ...baseMemory, id: 'mem-pinned', pinned: true } as any);

    const changed = repo.decayMemories('npc-marta' as any, 0.8);
    expect(changed).toBe(1);

    const decayed = repo.getMemory('mem-1' as any);
    expect(decayed!.recall_strength).toBeCloseTo(0.8, 2);

    const pinned = repo.getMemory('mem-pinned' as any);
    expect(pinned!.recall_strength).toBe(1.0);
    db.close();
  });

  it('deletes a memory', () => {
    const repo = createMemoryRepository(db);
    repo.insertMemory(baseMemory as any);
    expect(repo.deleteMemory('mem-1' as any)).toBe(true);
    expect(repo.getMemory('mem-1' as any)).toBeUndefined();
    expect(repo.deleteMemory('nonexistent' as any)).toBe(false);
    db.close();
  });
});

describe('AuditRepository', () => {
  let db: DB;

  beforeEach(() => { db = freshDb(); });

  it('logs and retrieves a roll', () => {
    const repo = createAuditRepository(db);
    const roll = {
      id: 'roll-1', session_id: 'sess-1', seed_offset: 0,
      scene_id: null, actor_id: 'pc-aryn', roll_type: 'check',
      skill_or_attack: 'athletics', dc: 15, total_modifier: 5,
      raw_result: 12, total_result: 17, degree: 'success',
      context: 'Aryn climbs the wall', rolled_at: Date.now(), world_time: null,
    };
    repo.logRoll(roll as any);
    const rolls = repo.getRolls('sess-1' as any);
    expect(rolls).toHaveLength(1);
    expect(rolls[0]!.total_result).toBe(17);
    expect(rolls[0]!.degree).toBe('success');
    db.close();
  });

  it('logs and retrieves a tool call', () => {
    const repo = createAuditRepository(db);
    const entry = {
      id: 'tc-1', session_id: 'sess-1', scene_id: null,
      agent_id: 'dm-agent', tool_name: 'update_hp',
      args: { actor_id: 'pc-aryn', delta: -5 },
      before_hash: 'abc', after_hash: 'def',
      rolled_back: false, ts: Date.now(),
    };
    repo.logToolCall(entry as any);
    const calls = repo.getToolCalls('sess-1' as any);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.tool_name).toBe('update_hp');
    expect(calls[0]!.args).toEqual({ actor_id: 'pc-aryn', delta: -5 });
    expect(calls[0]!.rolled_back).toBe(false);
    db.close();
  });
});
