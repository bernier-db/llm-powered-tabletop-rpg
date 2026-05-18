// src/schema/campaign-state.test.ts
import { describe, it, expect } from 'vitest';
import {
  FactionClockStateSchema,
  CampaignStateSchema,
  makeFactionClockState,
  makeCampaignState,
} from './campaign-state.js';

describe('FactionClockStateSchema', () => {
  it('accepts a valid clock with 1 of 4 segments filled', () => {
    const clock = makeFactionClockState();
    expect(() => FactionClockStateSchema.parse(clock)).not.toThrow();
  });

  it('accepts a clock at 0 segments (newly created)', () => {
    expect(() =>
      FactionClockStateSchema.parse(makeFactionClockState({ filled: 0 })),
    ).not.toThrow();
  });

  it('accepts a clock at exactly full (filled === segments)', () => {
    expect(() =>
      FactionClockStateSchema.parse(makeFactionClockState({ filled: 4, segments: 4 })),
    ).not.toThrow();
  });

  it('rejects filled > segments (structural invariant)', () => {
    // This enforces design/13-risks-tripwires.md HP/clock invariant: cannot exceed maximum
    expect(() =>
      FactionClockStateSchema.parse(makeFactionClockState({ filled: 5, segments: 4 })),
    ).toThrow();
  });

  it('rejects a non-positive segments value', () => {
    expect(() =>
      FactionClockStateSchema.parse(makeFactionClockState({ segments: 0, filled: 0 })),
    ).toThrow();
  });

  it('rejects a negative filled value', () => {
    expect(() =>
      FactionClockStateSchema.parse(makeFactionClockState({ filled: -1 })),
    ).toThrow();
  });

  it('rejects extra fields (strict mode)', () => {
    expect(() =>
      FactionClockStateSchema.parse({ ...makeFactionClockState(), extra_field: true }),
    ).toThrow();
  });
});

describe('CampaignStateSchema', () => {
  it('accepts a valid campaign state via factory', () => {
    const state = makeCampaignState();
    expect(() => CampaignStateSchema.parse(state)).not.toThrow();
  });

  it('accepts state with a faction clock, spotlight record, and a foreshadow seed', () => {
    expect(() =>
      CampaignStateSchema.parse(
        makeCampaignState({
          faction_clocks: [makeFactionClockState()],
          spotlight_tracker: { pc_aryn: 2, pc_bob: 0 },
          foreshadow_queue: [
            {
              id: 'foreshadow_cult_symbol',
              title: 'The Red Hand-Print',
              description: 'A burned mark on a roadside oak.',
              context_tags: ['cult_of_red_sigil'],
              suggested_placement: 'Surface on road travel.',
              pays_off_at_beat: '01_arrival',
              harvested: false,
              first_planted_in_scene: null,
              priority: 7,
              created_at: Date.now(),
            },
          ],
        }),
      ),
    ).not.toThrow();
  });

  it('rejects state with a clock where filled > segments', () => {
    expect(() =>
      CampaignStateSchema.parse(
        makeCampaignState({
          faction_clocks: [makeFactionClockState({ filled: 5, segments: 4 })],
        }),
      ),
    ).toThrow();
  });

  it('accepts spotlight_tracker with zero counts (all PCs at 0 scenes central)', () => {
    expect(() =>
      CampaignStateSchema.parse(
        makeCampaignState({ spotlight_tracker: { pc_aryn: 0, pc_kestrel: 0 } }),
      ),
    ).not.toThrow();
  });

  it('rejects a negative spotlight count', () => {
    expect(() =>
      CampaignStateSchema.parse(
        makeCampaignState({ spotlight_tracker: { pc_aryn: -1 } }),
      ),
    ).toThrow();
  });
});
