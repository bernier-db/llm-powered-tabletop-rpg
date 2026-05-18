// src/schema/quest.test.ts
import { describe, it, expect } from 'vitest';
import { QuestSchema, QuestBeatSchema } from './quest.js';

const validBeat = {
  id: 'find_vellis',
  description: 'Locate the missing merchant Vellis.',
  clue_edge_count: 3,
  is_required: true,
  is_completed: false,
  completed_at: null,
  associated_location_ids: ['location_market_district'],
};

const validQuest = {
  id: 'quest-missing-vellis',
  title: 'The Missing Ledger',
  description: 'A merchant named Vellis has vanished; find him and his coded ledger.',
  status: 'active' as const,
  related_actor_ids: ['vellis', 'barkeep_marta'],
  related_faction_ids: ['cult_of_red_sigil'],
  beats: [validBeat],
  started_at: 'Day 3, evening',
  completed_at: null,
  source_beat_id: '01_arrival',
};

describe('QuestBeatSchema', () => {
  it('accepts a valid required beat', () => {
    expect(() => QuestBeatSchema.parse(validBeat)).not.toThrow();
  });

  it('accepts an optional beat with 0 clue edges', () => {
    expect(() =>
      QuestBeatSchema.parse({
        ...validBeat,
        id: 'optional_discovery',
        clue_edge_count: 0,
        is_required: false,
      }),
    ).not.toThrow();
  });

  it('accepts a completed beat with a world-time stamp', () => {
    expect(() =>
      QuestBeatSchema.parse({
        ...validBeat,
        is_completed: true,
        completed_at: 'Day 3, late evening',
      }),
    ).not.toThrow();
  });

  it('rejects a beat with a negative clue_edge_count', () => {
    expect(() =>
      QuestBeatSchema.parse({ ...validBeat, clue_edge_count: -1 }),
    ).toThrow();
  });

  it('rejects a beat missing the description field', () => {
    const { description: _d, ...noDesc } = validBeat;
    expect(() => QuestBeatSchema.parse(noDesc)).toThrow();
  });
});

describe('QuestSchema', () => {
  it('accepts a valid active quest', () => {
    expect(() => QuestSchema.parse(validQuest)).not.toThrow();
  });

  it('accepts a completed quest', () => {
    expect(() =>
      QuestSchema.parse({
        ...validQuest,
        status: 'completed',
        completed_at: 'Day 4, dawn',
      }),
    ).not.toThrow();
  });

  it('accepts all four quest statuses', () => {
    for (const status of ['active', 'completed', 'failed', 'abandoned'] as const) {
      expect(() => QuestSchema.parse({ ...validQuest, status })).not.toThrow();
    }
  });

  it('rejects an unknown quest status', () => {
    expect(() =>
      QuestSchema.parse({ ...validQuest, status: 'paused' }),
    ).toThrow();
  });

  it('accepts a quest with an empty beats array', () => {
    expect(() =>
      QuestSchema.parse({ ...validQuest, beats: [] }),
    ).not.toThrow();
  });

  it('rejects a quest missing title', () => {
    const { title: _t, ...noTitle } = validQuest;
    expect(() => QuestSchema.parse(noTitle)).toThrow();
  });
});
