// src/schema/scene.test.ts
import { describe, it, expect } from 'vitest';
import { SceneBriefSchema, SceneSchema, SceneTranscriptEntrySchema } from './scene.js';

const validBrief = {
  scene_id: 'scene-001',
  pressure: 'The common room is quieter than it should be; Marta watches the door.',
  pacing_call: 'hold' as const,
  spotlight_nudge: null,
  planted_seeds: [
    {
      seed_id: 'foreshadow_cult_symbol',
      context_tags: ['cult_of_red_sigil', 'south_road'],
      suggested_placement: 'Surface if party asks about road news.',
    },
  ],
  npc_intersections: [],
  faction_evidence: ['Dead crow found on the road south.'],
  fail_forward_hooks: ['If perception check fails: Marta still mentions the locked counting house.'],
};

const validScene = {
  id: 'scene-001',
  location_id: 'location_drunken_goose',
  actors_present: ['pc_aryn', 'barkeep_marta'],
  status: 'active' as const,
  brief: null,
  opened_at: Date.now(),
  closed_at: null,
  warm_summary: null,
};

describe('SceneBriefSchema', () => {
  it('accepts a valid scene brief with planted seeds', () => {
    expect(() => SceneBriefSchema.parse(validBrief)).not.toThrow();
  });

  it('accepts a brief with an empty planted_seeds array', () => {
    expect(() =>
      SceneBriefSchema.parse({ ...validBrief, planted_seeds: [] }),
    ).not.toThrow();
  });

  it('accepts all three pacing_call values', () => {
    for (const call of ['escalate', 'breather', 'hold'] as const) {
      expect(() =>
        SceneBriefSchema.parse({ ...validBrief, pacing_call: call }),
      ).not.toThrow();
    }
  });

  it('rejects an unknown pacing_call', () => {
    expect(() =>
      SceneBriefSchema.parse({ ...validBrief, pacing_call: 'rush' }),
    ).toThrow();
  });

  it('accepts a spotlight_nudge with pc_id and reason', () => {
    expect(() =>
      SceneBriefSchema.parse({
        ...validBrief,
        spotlight_nudge: { pc_id: 'pc_aryn', reason: 'background underused 3 scenes' },
      }),
    ).not.toThrow();
  });

  it('rejects a brief missing the pressure field', () => {
    const { pressure: _p, ...noPressure } = validBrief;
    expect(() => SceneBriefSchema.parse(noPressure)).toThrow();
  });
});

describe('SceneTranscriptEntrySchema', () => {
  it('accepts a valid DM narration entry', () => {
    expect(() =>
      SceneTranscriptEntrySchema.parse({
        entry_id: 'entry-001',
        scene_id: 'scene-001',
        turn_index: 0,
        speaker_id: null,
        speaker_role: 'dm',
        text: 'The Drunken Goose is warm and low-ceilinged.',
        world_time: 'Day 3, late afternoon',
        wall_time: Date.now(),
        contains_roll_outcome: false,
        contains_entity_introduction: false,
        contains_decision: false,
        contains_emotional_beat: true,
      }),
    ).not.toThrow();
  });

  it('accepts all valid speaker roles', () => {
    const roles = ['dm', 'player', 'npc', 'companion', 'combat_agent', 'system'] as const;
    for (const role of roles) {
      expect(() =>
        SceneTranscriptEntrySchema.parse({
          entry_id: 'entry-x',
          scene_id: 'scene-001',
          turn_index: 1,
          speaker_id: null,
          speaker_role: role,
          text: 'test',
          world_time: 'Day 1',
          wall_time: Date.now(),
          contains_roll_outcome: false,
          contains_entity_introduction: false,
          contains_decision: false,
          contains_emotional_beat: false,
        }),
      ).not.toThrow();
    }
  });

  it('rejects an unknown speaker_role', () => {
    expect(() =>
      SceneTranscriptEntrySchema.parse({
        entry_id: 'x',
        scene_id: 'scene-001',
        turn_index: 0,
        speaker_id: null,
        speaker_role: 'narrator',
        text: 'x',
        world_time: 'Day 1',
        wall_time: Date.now(),
        contains_roll_outcome: false,
        contains_entity_introduction: false,
        contains_decision: false,
        contains_emotional_beat: false,
      }),
    ).toThrow();
  });

  it('rejects a negative turn_index', () => {
    expect(() =>
      SceneTranscriptEntrySchema.parse({
        entry_id: 'x',
        scene_id: 'scene-001',
        turn_index: -1,
        speaker_id: null,
        speaker_role: 'dm',
        text: 'x',
        world_time: 'Day 1',
        wall_time: Date.now(),
        contains_roll_outcome: false,
        contains_entity_introduction: false,
        contains_decision: false,
        contains_emotional_beat: false,
      }),
    ).toThrow();
  });
});

describe('SceneSchema', () => {
  it('accepts an active scene with no brief', () => {
    expect(() => SceneSchema.parse(validScene)).not.toThrow();
  });

  it('accepts a closed scene with a warm summary', () => {
    expect(() =>
      SceneSchema.parse({
        ...validScene,
        status: 'closed',
        closed_at: Date.now(),
        warm_summary: 'The party arrived and spoke with Marta. Vellis is missing.',
      }),
    ).not.toThrow();
  });

  it('accepts a scene with a full director brief', () => {
    expect(() =>
      SceneSchema.parse({ ...validScene, brief: validBrief }),
    ).not.toThrow();
  });

  it('rejects an unknown scene status', () => {
    expect(() => SceneSchema.parse({ ...validScene, status: 'paused' })).toThrow();
  });

  it('rejects a scene with no actors_present field', () => {
    const { actors_present: _a, ...noActors } = validScene;
    expect(() => SceneSchema.parse(noActors)).toThrow();
  });
});
