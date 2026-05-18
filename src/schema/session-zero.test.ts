// src/schema/session-zero.test.ts
import { describe, it, expect } from 'vitest';
import { SessionZeroSchema, ContentLineSchema, VeilSchema, makeSessionZero } from './session-zero.js';

describe('ContentLineSchema', () => {
  it('accepts a valid content line', () => {
    expect(() =>
      ContentLineSchema.parse({ topic: 'graphic torture' }),
    ).not.toThrow();
  });

  it('rejects an empty topic string', () => {
    expect(() => ContentLineSchema.parse({ topic: '' })).toThrow();
  });

  it('rejects extra fields (strict mode)', () => {
    expect(() =>
      ContentLineSchema.parse({ topic: 'violence', enforcement: 'block' }),
    ).toThrow();
  });
});

describe('VeilSchema', () => {
  it('accepts a valid veil', () => {
    expect(() => VeilSchema.parse({ topic: 'sexual content' })).not.toThrow();
  });

  it('rejects an empty topic', () => {
    expect(() => VeilSchema.parse({ topic: '' })).toThrow();
  });
});

describe('SessionZeroSchema', () => {
  it('accepts a valid minimal session zero config via factory', () => {
    const sz = makeSessionZero();
    expect(() => SessionZeroSchema.parse(sz)).not.toThrow();
  });

  it('accepts all nine tone values', () => {
    const tones = ['heroic', 'gritty', 'horror', 'comedy', 'political', 'pulp', 'mystery', 'cozy', 'weird'] as const;
    for (const tone of tones) {
      expect(() => SessionZeroSchema.parse(makeSessionZero({ tone }))).not.toThrow();
    }
  });

  it('accepts all three lethality values', () => {
    for (const lethality of ['cinematic', 'standard', 'brutal'] as const) {
      expect(() =>
        SessionZeroSchema.parse(makeSessionZero({ lethality })),
      ).not.toThrow();
    }
  });

  it('accepts both pacing values', () => {
    expect(() =>
      SessionZeroSchema.parse(makeSessionZero({ pacing: 'fast-cut' })),
    ).not.toThrow();
    expect(() =>
      SessionZeroSchema.parse(makeSessionZero({ pacing: 'slow-burn' })),
    ).not.toThrow();
  });

  it('accepts both combat granularity values', () => {
    expect(() =>
      SessionZeroSchema.parse(makeSessionZero({ combat_granularity: 'narrative' })),
    ).not.toThrow();
    expect(() =>
      SessionZeroSchema.parse(makeSessionZero({ combat_granularity: 'tactical' })),
    ).not.toThrow();
  });

  it('accepts session zero with populated content_lines and veils', () => {
    expect(() =>
      SessionZeroSchema.parse(
        makeSessionZero({
          content_lines: [{ topic: 'child harm' }, { topic: 'sexual violence' }],
          veils: [{ topic: 'torture detail' }],
        }),
      ),
    ).not.toThrow();
  });

  it('matches the test_smallest/campaign.yaml fixture shape (tone: heroic, lethality: standard, empty lines)', () => {
    // Cross-ref: campaigns/test_smallest/campaign.yaml session_zero block
    expect(() =>
      SessionZeroSchema.parse({
        campaign_id: 'test_smallest',
        tone: 'heroic',
        content_lines: [],
        veils: [],
        lethality: 'standard',
        pacing: 'fast-cut',
        combat_granularity: 'narrative',
      }),
    ).not.toThrow();
  });

  it('rejects an unknown tone value', () => {
    expect(() =>
      SessionZeroSchema.parse(makeSessionZero({ tone: 'low-fantasy' as never })),
    ).toThrow();
  });

  it('rejects extra fields (strict mode)', () => {
    expect(() =>
      SessionZeroSchema.parse({ ...makeSessionZero(), house_rules: [] }),
    ).toThrow();
  });

  it('rejects a missing campaign_id', () => {
    const { campaign_id: _cid, ...noCampaign } = makeSessionZero();
    expect(() => SessionZeroSchema.parse(noCampaign)).toThrow();
  });
});
