// src/schema/faction.test.ts
import { describe, it, expect } from 'vitest';
import { FactionSchema, FactionClockSchema } from './faction.js';

const validClock = {
  id: 'clock-cult-rite',
  faction_id: 'cult_of_red_sigil',
  name: 'The Rite Advances',
  segments_total: 4,
  segments_current: 1,
  segment_labels: [
    '1: Foothold',
    '2: Passage',
    '3: Gathering',
    '4: Consecration',
  ],
  completion_consequence: 'The binding rite is performed at solstice.',
  advancement_rule: 'Director advances when party fails to intervene.',
  last_advanced_at: null,
};

const validFaction = {
  id: 'cult_of_red_sigil',
  name: 'The Cult of the Red Sigil',
  goal: 'Re-consecrate the old hill-shrine and perform the binding rite.',
  member_ids: ['vellis', 'antagonist_a'],
  clock: validClock,
  disposition_toward_party: 0,
  disposition_label: 'unknown',
  codex_entry_id: null,
};

describe('FactionClockSchema', () => {
  it('accepts a valid clock with 1 segment filled', () => {
    expect(() => FactionClockSchema.parse(validClock)).not.toThrow();
  });

  it('accepts a clock with 0 segments filled (just started)', () => {
    expect(() =>
      FactionClockSchema.parse({ ...validClock, segments_current: 0 }),
    ).not.toThrow();
  });

  it('accepts a clock at exactly full (segments_current === segments_total)', () => {
    expect(() =>
      FactionClockSchema.parse({ ...validClock, segments_current: 4 }),
    ).not.toThrow();
  });

  it('rejects segments_total below 4 (design minimum is 4)', () => {
    expect(() =>
      FactionClockSchema.parse({ ...validClock, segments_total: 3 }),
    ).toThrow();
  });

  it('rejects segments_total above 8 (design maximum is 8)', () => {
    expect(() =>
      FactionClockSchema.parse({ ...validClock, segments_total: 9 }),
    ).toThrow();
  });

  it('rejects segments_current below 0', () => {
    expect(() =>
      FactionClockSchema.parse({ ...validClock, segments_current: -1 }),
    ).toThrow();
  });
});

describe('FactionSchema', () => {
  it('accepts a valid faction with a clock', () => {
    expect(() => FactionSchema.parse(validFaction)).not.toThrow();
  });

  it('accepts a faction with no clock (null)', () => {
    expect(() =>
      FactionSchema.parse({ ...validFaction, clock: null }),
    ).not.toThrow();
  });

  it('rejects disposition_toward_party above +10', () => {
    expect(() =>
      FactionSchema.parse({ ...validFaction, disposition_toward_party: 11 }),
    ).toThrow();
  });

  it('rejects disposition_toward_party below -10', () => {
    expect(() =>
      FactionSchema.parse({ ...validFaction, disposition_toward_party: -11 }),
    ).toThrow();
  });

  it('accepts faction with empty member list', () => {
    expect(() =>
      FactionSchema.parse({ ...validFaction, member_ids: [] }),
    ).not.toThrow();
  });

  it('rejects a faction missing the goal field', () => {
    const { goal: _g, ...noGoal } = validFaction;
    expect(() => FactionSchema.parse(noGoal)).toThrow();
  });
});
