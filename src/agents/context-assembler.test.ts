import { describe, it, expect, beforeEach } from 'vitest';
import { join } from 'node:path';
import { openDatabase } from '../db/database.js';
import { applyMigrations } from '../db/migrations.js';
import { createCampaignRepository } from '../db/repositories/campaign-repository.js';
import { createSessionRepository } from '../db/repositories/session-repository.js';
import { createContextAssembler } from './context-assembler.js';
import type { DB } from '../db/database.js';
import type { GameState } from '../db/repositories/session-repository.js';
import type { SessionZero } from '../schema/session-zero.js';

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
    knowledge: ['cult lore'],
  });

  db.prepare(`INSERT INTO locations (id, name, type, description)
    VALUES (?, ?, ?, ?)`).run('loc-inn', 'The Drunken Goose', 'building', 'A well-worn tavern with creaky floorboards.');

  db.prepare(`INSERT INTO actors (id, name, controller, sheet_json, agent_profile_json, is_player_character, description)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run('npc-marta', 'Marta', 'dm', sheet, profile, 0, 'Innkeeper');

  db.prepare(`INSERT INTO scenes (id, location_id, opened_at)
    VALUES (?, ?, ?)`).run('sc-1', 'loc-inn', Date.now());
}

const baseState: GameState = {
  id: 'current',
  campaign_id: 'camp-1',
  session_id: 'sess-1',
  current_scene_id: 'sc-1',
  turn_number: 0,
  world_time: 'Day 1, morning',
  state_json: JSON.stringify({ current_location_id: 'loc-inn' }),
  updated_at: Date.now(),
};

const testSessionZero: SessionZero = {
  campaign_id: 'camp-1',
  tone: 'heroic',
  content_lines: [{ topic: 'graphic torture' }],
  veils: [{ topic: 'romantic scenes' }],
  lethality: 'standard',
  pacing: 'fast-cut',
  combat_granularity: 'narrative',
} as SessionZero;

describe('ContextAssembler', () => {
  let db: DB;

  beforeEach(() => {
    db = freshDb();
    seedTestData(db);
  });

  it('builds a system prompt with DM role instructions', () => {
    const assembler = createContextAssembler({
      campaignRepo: createCampaignRepository(db),
      sessionRepo: createSessionRepository(db),
    });
    const prompt = assembler.buildSystemPrompt(baseState);
    expect(prompt).toContain('Dungeon Master');
    expect(prompt).toContain('tabletop voice');
    db.close();
  });

  it('includes session-zero config when provided', () => {
    const assembler = createContextAssembler(
      {
        campaignRepo: createCampaignRepository(db),
        sessionRepo: createSessionRepository(db),
      },
      { sessionZero: testSessionZero },
    );
    const prompt = assembler.buildSystemPrompt(baseState);
    expect(prompt).toContain('Tone: heroic');
    expect(prompt).toContain('Lethality: standard');
    expect(prompt).toContain('graphic torture');
    expect(prompt).toContain('romantic scenes');
    db.close();
  });

  it('includes campaign setting when provided', () => {
    const assembler = createContextAssembler(
      {
        campaignRepo: createCampaignRepository(db),
        sessionRepo: createSessionRepository(db),
      },
      { campaignSetting: 'A dark fantasy world where the Red Sigil cult threatens the land.' },
    );
    const prompt = assembler.buildSystemPrompt(baseState);
    expect(prompt).toContain('Red Sigil cult');
    db.close();
  });

  it('includes current location when derivable from state', () => {
    const assembler = createContextAssembler({
      campaignRepo: createCampaignRepository(db),
      sessionRepo: createSessionRepository(db),
    });
    const prompt = assembler.buildSystemPrompt(baseState);
    expect(prompt).toContain('The Drunken Goose');
    expect(prompt).toContain('well-worn tavern');
    db.close();
  });

  it('includes NPC listing', () => {
    const assembler = createContextAssembler({
      campaignRepo: createCampaignRepository(db),
      sessionRepo: createSessionRepository(db),
    });
    const prompt = assembler.buildSystemPrompt(baseState);
    expect(prompt).toContain('Marta');
    expect(prompt).toContain('suspicious');
    db.close();
  });

  it('respects token budget by dropping low-priority sections', () => {
    const assembler = createContextAssembler(
      {
        campaignRepo: createCampaignRepository(db),
        sessionRepo: createSessionRepository(db),
      },
      {
        maxTokens: 200,
        campaignSetting: 'A'.repeat(2000),
        sessionZero: testSessionZero,
      },
    );
    const prompt = assembler.buildSystemPrompt(baseState);
    const estimatedTokens = Math.ceil(prompt.length / 4);
    expect(estimatedTokens).toBeLessThanOrEqual(200);
    expect(prompt).toContain('Dungeon Master');
    db.close();
  });

  it('builds messages from transcript entries', () => {
    const assembler = createContextAssembler({
      campaignRepo: createCampaignRepository(db),
      sessionRepo: createSessionRepository(db),
    });
    const transcript = [
      { speaker_role: 'player', text: 'I search the room.', entry_id: '1', scene_id: 'sc-1', turn_index: 0, speaker_id: 'pc-aryn', world_time: 'Day 1', wall_time: Date.now(), contains_roll_outcome: false, contains_entity_introduction: false, contains_decision: false, contains_emotional_beat: false },
      { speaker_role: 'dm', text: 'You find a hidden compartment.', entry_id: '2', scene_id: 'sc-1', turn_index: 1, speaker_id: null, world_time: 'Day 1', wall_time: Date.now(), contains_roll_outcome: false, contains_entity_introduction: false, contains_decision: false, contains_emotional_beat: false },
    ] as any[];

    const messages = assembler.buildMessages(transcript);
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: 'user', content: 'I search the room.' });
    expect(messages[1]).toEqual({ role: 'assistant', content: 'You find a hidden compartment.' });
    db.close();
  });

  it('maps non-player roles to assistant', () => {
    const assembler = createContextAssembler({
      campaignRepo: createCampaignRepository(db),
      sessionRepo: createSessionRepository(db),
    });
    const transcript = [
      { speaker_role: 'npc', text: 'Greetings, traveler.' },
      { speaker_role: 'system', text: 'Initiative rolled.' },
      { speaker_role: 'companion', text: 'I will cover your retreat.' },
    ] as any[];

    const messages = assembler.buildMessages(transcript);
    expect(messages.every(m => m.role === 'assistant')).toBe(true);
    db.close();
  });
});
