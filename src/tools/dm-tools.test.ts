import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { openDatabase } from '../db/database.js';
import { applyMigrations } from '../db/migrations.js';
import { createCampaignRepository } from '../db/repositories/campaign-repository.js';
import { createSessionRepository } from '../db/repositories/session-repository.js';
import { createAuditRepository } from '../db/repositories/audit-repository.js';
import { HealthTracker } from '../health/health-tracker.js';
import { createDMTools } from './dm-tools.js';
import { createS03Stubs } from './tool-stubs.js';
import type { DB } from '../db/database.js';

const MIGRATIONS_DIR = join(import.meta.dirname, '../../migrations');

function freshDb(): DB {
  const db = openDatabase(':memory:');
  applyMigrations(db, MIGRATIONS_DIR);
  return db;
}

function seedTestData(db: DB) {
  const sheet = JSON.stringify({
    hp_current: 20, hp_max: 20, ac: 15, level: 1, archetype: 'Fighter',
    ability_scores: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
    saves: { fort: 4, ref: 1, will: 0 }, speed: 25, actions_remaining: 3,
    conditions: [], skills: { athletics: 5 },
  });
  const profile = JSON.stringify({
    goals: ['serve the cult'], personality: ['suspicious', 'devout'],
    speech_sample: 'The red sigil watches.', secrets: ['knows the ritual location'],
    knowledge: ['cult lore'], voice_register: 'low, gravelly',
  });

  db.prepare(`INSERT INTO locations (id, name, type, description)
    VALUES (?, ?, ?, ?)`).run('loc-inn', 'The Drunken Goose', 'building', 'A well-worn tavern with creaky floorboards.');
  db.prepare(`INSERT INTO locations (id, name, type, description)
    VALUES (?, ?, ?, ?)`).run('loc-forest', 'Darkwood Forest', 'wilderness_zone', 'A dense, misty forest.');

  db.prepare(`INSERT INTO actors (id, name, controller, sheet_json, agent_profile_json, is_player_character, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run('npc-marta', 'Marta', 'dm', sheet, profile, 0, 'A suspicious innkeeper.');
  db.prepare(`INSERT INTO actors (id, name, controller, sheet_json, is_player_character, description)
    VALUES (?, ?, ?, ?, ?, ?)`).run('pc-aryn', 'Aryn', 'human', sheet, 1, 'A human fighter.');

  db.prepare(`INSERT INTO scenes (id, location_id, opened_at)
    VALUES (?, ?, ?)`).run('sc-1', 'loc-inn', Date.now());
  db.prepare(`INSERT INTO game_state (id, campaign_id, session_id, current_scene_id, turn_number, state_json, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run('current', 'camp-1', 'sess-1', 'sc-1', 0, '{}', Date.now());
}

describe('DM Tools', () => {
  let db: DB;
  let tools: ReturnType<typeof createDMTools>;
  let healthTracker: HealthTracker;
  let offset: number;

  beforeEach(() => {
    db = freshDb();
    seedTestData(db);
    healthTracker = new HealthTracker();
    offset = 0;

    tools = createDMTools({
      campaignRepo: createCampaignRepository(db),
      sessionRepo: createSessionRepository(db),
      auditRepo: createAuditRepository(db),
      healthTracker,
      sessionId: 'sess-1',
      sceneId: 'sc-1',
      seedOffset: () => offset++,
    });
  });

  describe('lookup_location', () => {
    it('returns location data for a valid ID', async () => {
      const result = await tools.lookup_location.execute(
        { location_id: 'loc-inn' },
        { toolCallId: 'tc-1', messages: [], abortSignal: undefined as any },
      );
      expect(result.found).toBe(true);
      expect((result as any).name).toBe('The Drunken Goose');
      expect((result as any).type).toBe('building');
    });

    it('returns not-found for missing location', async () => {
      const result = await tools.lookup_location.execute(
        { location_id: 'loc-nonexistent' },
        { toolCallId: 'tc-2', messages: [], abortSignal: undefined as any },
      );
      expect(result.found).toBe(false);
    });

    it('records success in health tracker', async () => {
      await tools.lookup_location.execute(
        { location_id: 'loc-inn' },
        { toolCallId: 'tc-3', messages: [], abortSignal: undefined as any },
      );
      expect(healthTracker.getStatus('dm-tools').status).toBe('healthy');
    });
  });

  describe('lookup_npc', () => {
    it('returns NPC data with profile for a valid ID', async () => {
      const result = await tools.lookup_npc.execute(
        { npc_id: 'npc-marta' },
        { toolCallId: 'tc-4', messages: [], abortSignal: undefined as any },
      );
      expect(result.found).toBe(true);
      expect((result as any).name).toBe('Marta');
      expect((result as any).profile).toBeDefined();
      expect((result as any).profile.personality).toContain('suspicious');
    });

    it('returns not-found for missing NPC', async () => {
      const result = await tools.lookup_npc.execute(
        { npc_id: 'npc-ghost' },
        { toolCallId: 'tc-5', messages: [], abortSignal: undefined as any },
      );
      expect(result.found).toBe(false);
    });
  });

  describe('roll_dice', () => {
    it('returns dice result and logs to roll_log', async () => {
      const result = await tools.roll_dice.execute(
        { count: 1, sides: 20, modifier: 3, context: 'Athletics check' },
        { toolCallId: 'tc-6', messages: [], abortSignal: undefined as any },
      );
      expect(result.rolls).toHaveLength(1);
      expect(result.rolls[0]).toBeGreaterThanOrEqual(1);
      expect(result.rolls[0]).toBeLessThanOrEqual(20);
      expect(result.total).toBe(result.rolls[0]! + 3);
      expect(result.formula).toBe('1d20+3');

      const rolls = createAuditRepository(db).getRolls('sess-1' as any);
      expect(rolls).toHaveLength(1);
      expect(rolls[0]!.context).toBe('Athletics check');
    });

    it('logs roll BEFORE returning result (audit-first)', async () => {
      await tools.roll_dice.execute(
        { count: 2, sides: 6, context: 'Damage roll' },
        { toolCallId: 'tc-7', messages: [], abortSignal: undefined as any },
      );
      const rolls = createAuditRepository(db).getRolls('sess-1' as any);
      expect(rolls).toHaveLength(1);
      expect(rolls[0]!.context).toBe('Damage roll');
    });
  });

  describe('save_turn', () => {
    it('saves player input and DM narration as turns', async () => {
      const result = await tools.save_turn.execute(
        { narration: 'The tavern falls silent as you enter.', player_input: 'I enter the tavern.' },
        { toolCallId: 'tc-8', messages: [], abortSignal: undefined as any },
      );
      expect(result.saved).toBe(true);
      expect(result.turn_index).toBe(0);

      const turns = createSessionRepository(db).getTurns('sess-1' as any, 'sc-1' as any);
      expect(turns).toHaveLength(2);
      expect(turns[0]!.speaker_role).toBe('player');
      expect(turns[0]!.text).toBe('I enter the tavern.');
      expect(turns[1]!.speaker_role).toBe('dm');
      expect(turns[1]!.text).toBe('The tavern falls silent as you enter.');
    });

    it('increments game state turn number', async () => {
      await tools.save_turn.execute(
        { narration: 'Narration.', player_input: 'Input.' },
        { toolCallId: 'tc-9', messages: [], abortSignal: undefined as any },
      );
      const state = createSessionRepository(db).getGameState();
      expect(state!.turn_number).toBe(2);
    });
  });

  describe('tool call logging', () => {
    it('logs every tool call to tool_call_log', async () => {
      await tools.lookup_location.execute(
        { location_id: 'loc-inn' },
        { toolCallId: 'tc-10', messages: [], abortSignal: undefined as any },
      );
      const calls = createAuditRepository(db).getToolCalls('sess-1' as any);
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls.some(c => c.tool_name === 'lookup_location')).toBe(true);
    });
  });
});

describe('S03 Tool Stubs', () => {
  const stubs = createS03Stubs();

  it('handoff_to_npc throws stub error', async () => {
    await expect(
      stubs.handoff_to_npc.execute(
        { npc_id: 'npc-marta', context: 'test' },
        { toolCallId: 'tc-s1', messages: [], abortSignal: undefined as any },
      ),
    ).rejects.toThrow('Not available in S02');
  });

  it('save_memory throws stub error', async () => {
    await expect(
      stubs.save_memory.execute(
        { npc_id: 'npc-marta', event_summary: 'test', valence: 1, salience: 5 },
        { toolCallId: 'tc-s2', messages: [], abortSignal: undefined as any },
      ),
    ).rejects.toThrow('Not available in S02');
  });

  it('recall_npc_memories throws stub error', async () => {
    await expect(
      stubs.recall_npc_memories.execute(
        { npc_id: 'npc-marta' },
        { toolCallId: 'tc-s3', messages: [], abortSignal: undefined as any },
      ),
    ).rejects.toThrow('Not available in S02');
  });
});
