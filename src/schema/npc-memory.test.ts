// src/schema/npc-memory.test.ts
import { describe, it, expect } from 'vitest';
import { NPCMemorySchema, ValenceSchema, SalienceSchema, DispositionSchema } from './npc-memory.js';

// Minimal valid memory shape used across tests
const validMemory = {
  id: 'mem-001',
  npc_id: 'barkeep_marta',
  event_summary: 'Marta saw robed figures lead Vellis away at midnight.',
  valence: -3,
  salience: 10,
  recall_strength: 1.0,
  related_actor_ids: ['vellis'],
  pinned: true,
  ts: 'Day 3, late evening',
  created_at: Date.now(),
  vector_ref: null,
};

describe('ValenceSchema', () => {
  it('accepts all integers from -3 to +3', () => {
    for (const v of [-3, -2, -1, 0, 1, 2, 3]) {
      expect(() => ValenceSchema.parse(v)).not.toThrow();
    }
  });

  it('rejects valence of +4 (above max)', () => {
    expect(() => ValenceSchema.parse(4)).toThrow();
  });

  it('rejects valence of -4 (below min)', () => {
    expect(() => ValenceSchema.parse(-4)).toThrow();
  });

  it('rejects a float valence', () => {
    expect(() => ValenceSchema.parse(1.5)).toThrow();
  });
});

describe('SalienceSchema', () => {
  it('accepts all integers from 1 to 10', () => {
    for (const s of [1, 5, 10]) {
      expect(() => SalienceSchema.parse(s)).not.toThrow();
    }
  });

  it('rejects salience of 0 (below min)', () => {
    expect(() => SalienceSchema.parse(0)).toThrow();
  });

  it('rejects salience of 11 (above max)', () => {
    expect(() => SalienceSchema.parse(11)).toThrow();
  });

  it('rejects a string salience', () => {
    expect(() => SalienceSchema.parse('high')).toThrow();
  });
});

describe('NPCMemorySchema', () => {
  it('accepts a valid pinned memory entry', () => {
    expect(() => NPCMemorySchema.parse(validMemory)).not.toThrow();
  });

  it('accepts a non-pinned memory with partial recall (decay in progress)', () => {
    expect(() =>
      NPCMemorySchema.parse({
        ...validMemory,
        id: 'mem-002',
        pinned: false,
        recall_strength: 0.4,
        valence: -1,
        salience: 3,
      }),
    ).not.toThrow();
  });

  it('rejects recall_strength above 1.0', () => {
    expect(() =>
      NPCMemorySchema.parse({ ...validMemory, recall_strength: 1.1 }),
    ).toThrow();
  });

  it('rejects recall_strength below 0', () => {
    expect(() =>
      NPCMemorySchema.parse({ ...validMemory, recall_strength: -0.1 }),
    ).toThrow();
  });

  it('rejects valence outside -3..+3', () => {
    expect(() =>
      NPCMemorySchema.parse({ ...validMemory, valence: 5 }),
    ).toThrow();
  });

  it('rejects salience outside 1..10', () => {
    expect(() =>
      NPCMemorySchema.parse({ ...validMemory, salience: 0 }),
    ).toThrow();
  });

  it('pinned memories exempt from decay — schema accepts recall_strength: 1.0 + pinned: true', () => {
    // This is the design invariant from spec/04-npc-memory.md §Decay:
    // pinned memories are always included in top-K regardless of recency.
    // The schema does not enforce decay = 1.0 for pinned (the engine does at read time),
    // but it must at minimum accept the valid combination.
    expect(() =>
      NPCMemorySchema.parse({ ...validMemory, pinned: true, recall_strength: 1.0 }),
    ).not.toThrow();
  });
});

describe('DispositionSchema', () => {
  it('accepts a valid disposition', () => {
    expect(() =>
      DispositionSchema.parse({
        npc_id: 'barkeep_marta',
        target_actor_id: 'pc_aryn',
        score: -2,
        label: 'suspicious',
      }),
    ).not.toThrow();
  });

  it('rejects score above +10', () => {
    expect(() =>
      DispositionSchema.parse({
        npc_id: 'marta',
        target_actor_id: 'aryn',
        score: 11,
        label: 'friendly',
      }),
    ).toThrow();
  });

  it('rejects score below -10', () => {
    expect(() =>
      DispositionSchema.parse({
        npc_id: 'marta',
        target_actor_id: 'aryn',
        score: -11,
        label: 'hostile',
      }),
    ).toThrow();
  });

  it('accepts score 0 (disposition unknown / neutral)', () => {
    expect(() =>
      DispositionSchema.parse({
        npc_id: 'antagonist_a',
        target_actor_id: 'pc_aryn',
        score: 0,
        label: 'unknown',
      }),
    ).not.toThrow();
  });
});
