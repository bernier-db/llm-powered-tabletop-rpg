// src/schema/foreshadow.test.ts
import { describe, it, expect } from 'vitest';
import { ForeshadowSeedSchema, ForeshadowQueueSchema } from './foreshadow.js';

const validSeed = {
  id: 'foreshadow_cult_symbol',
  title: 'The Red Hand-Print',
  description: 'A hand-print burned into a roadside oak south of Stonebridge.',
  context_tags: ['cult_of_red_sigil', 'south_road', 'visual_marker'],
  suggested_placement: 'Surface if party asks about road news or travels south.',
  pays_off_at_beat: '01_arrival',
  harvested: false,
  first_planted_in_scene: null,
  priority: 7,
  created_at: Date.now(),
};

describe('ForeshadowSeedSchema', () => {
  it('accepts a valid unharvested seed', () => {
    expect(() => ForeshadowSeedSchema.parse(validSeed)).not.toThrow();
  });

  it('accepts a harvested seed with a planted scene reference', () => {
    expect(() =>
      ForeshadowSeedSchema.parse({
        ...validSeed,
        harvested: true,
        first_planted_in_scene: 'scene-001',
      }),
    ).not.toThrow();
  });

  it('accepts priority at the boundaries (0 and 10)', () => {
    expect(() => ForeshadowSeedSchema.parse({ ...validSeed, priority: 0 })).not.toThrow();
    expect(() => ForeshadowSeedSchema.parse({ ...validSeed, priority: 10 })).not.toThrow();
  });

  it('rejects priority above 10', () => {
    expect(() => ForeshadowSeedSchema.parse({ ...validSeed, priority: 11 })).toThrow();
  });

  it('rejects priority below 0', () => {
    expect(() => ForeshadowSeedSchema.parse({ ...validSeed, priority: -1 })).toThrow();
  });

  it('accepts null pays_off_at_beat (general foreshadowing with no single payoff)', () => {
    expect(() =>
      ForeshadowSeedSchema.parse({ ...validSeed, pays_off_at_beat: null }),
    ).not.toThrow();
  });

  it('rejects a seed missing context_tags', () => {
    const { context_tags: _ct, ...noTags } = validSeed;
    expect(() => ForeshadowSeedSchema.parse(noTags)).toThrow();
  });
});

describe('ForeshadowQueueSchema', () => {
  it('accepts a valid queue with seeds', () => {
    expect(() =>
      ForeshadowQueueSchema.parse({
        campaign_id: 'test_smallest',
        seeds: [validSeed],
      }),
    ).not.toThrow();
  });

  it('accepts an empty seed queue (no seeds yet planted)', () => {
    expect(() =>
      ForeshadowQueueSchema.parse({
        campaign_id: 'test_smallest',
        seeds: [],
      }),
    ).not.toThrow();
  });

  it('rejects a queue missing campaign_id', () => {
    expect(() =>
      ForeshadowQueueSchema.parse({ seeds: [validSeed] }),
    ).toThrow();
  });

  it('rejects a queue with an invalid seed inside', () => {
    expect(() =>
      ForeshadowQueueSchema.parse({
        campaign_id: 'test_smallest',
        seeds: [{ ...validSeed, priority: 99 }], // out of range
      }),
    ).toThrow();
  });
});
