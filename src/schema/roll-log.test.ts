// src/schema/roll-log.test.ts
import { describe, it, expect } from 'vitest';
import { RollLogSchema, RollTypeSchema } from './roll-log.js';

const validRoll = {
  id: 'roll-001',
  session_id: 'session-001',
  seed_offset: 0,
  scene_id: 'scene-001',
  actor_id: 'pc_aryn',
  roll_type: 'check' as const,
  skill_or_attack: 'perception',
  dc: 15,
  total_modifier: 5,
  raw_result: 12,
  total_result: 17,
  degree: 'success' as const,
  context: 'Aryn scans the common room for anything unusual.',
  rolled_at: Date.now(),
  world_time: 'Day 3, late afternoon',
};

describe('RollTypeSchema', () => {
  it('accepts all valid roll types', () => {
    const types = ['check', 'attack', 'cast_spell', 'save', 'initiative', 'damage', 'healing', 'raw'] as const;
    for (const t of types) {
      expect(() => RollTypeSchema.parse(t)).not.toThrow();
    }
  });

  it('rejects an unknown roll type', () => {
    expect(() => RollTypeSchema.parse('luck')).toThrow();
  });
});

describe('RollLogSchema', () => {
  it('accepts a valid skill check roll log entry', () => {
    expect(() => RollLogSchema.parse(validRoll)).not.toThrow();
  });

  it('accepts a damage roll (no degree, no DC)', () => {
    expect(() =>
      RollLogSchema.parse({
        ...validRoll,
        id: 'roll-002',
        roll_type: 'damage',
        skill_or_attack: 'shortsword',
        dc: null,
        total_modifier: null,
        raw_result: 6,
        total_result: 6,
        degree: null,
        context: 'Aryn hits the cultist with a shortsword.',
      }),
    ).not.toThrow();
  });

  it('rejects a negative seed_offset (invariant: first-roll offset is 0)', () => {
    expect(() =>
      RollLogSchema.parse({ ...validRoll, seed_offset: -1 }),
    ).toThrow();
  });

  it('accepts seed_offset of 0 (first roll in the session)', () => {
    expect(() => RollLogSchema.parse({ ...validRoll, seed_offset: 0 })).not.toThrow();
  });

  it('accepts a large seed_offset (many rolls into a session)', () => {
    expect(() => RollLogSchema.parse({ ...validRoll, seed_offset: 9999 })).not.toThrow();
  });

  it('accepts null actor_id (environment / encounter-table rolls)', () => {
    expect(() =>
      RollLogSchema.parse({ ...validRoll, actor_id: null }),
    ).not.toThrow();
  });

  it('rejects a roll with an unknown degree value', () => {
    expect(() =>
      RollLogSchema.parse({ ...validRoll, degree: 'partial' }),
    ).toThrow();
  });

  it('accepts all four degree values', () => {
    for (const degree of ['crit_fail', 'fail', 'success', 'crit_success'] as const) {
      expect(() => RollLogSchema.parse({ ...validRoll, degree })).not.toThrow();
    }
  });
});
