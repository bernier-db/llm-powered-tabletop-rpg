// src/schema/authored-campaign.test.ts
//
// Tests for the authored-campaign schemas — the shapes that validate
// files under campaigns/<name>/. These are intentionally looser than
// runtime schemas; see authored-campaign.ts for the rationale.
import { describe, it, expect } from 'vitest';
import {
  NPCAuthoredSchema,
  LocationAuthoredSchema,
  FactionAuthoredSchema,
  BeatAuthoredSchema,
  ForeshadowSeedAuthoredSchema,
  EncounterTableAuthoredSchema,
  CampaignAuthoredSchema,
} from './authored-campaign.js';

// ─── NPCAuthoredSchema ────────────────────────────────────────────────────────

describe('NPCAuthoredSchema', () => {
  it('accepts a minimal NPC with id and name only', () => {
    expect(() => NPCAuthoredSchema.parse({ id: 'vellis', name: 'Vellis' })).not.toThrow();
  });

  it('accepts a full PC (pc_aryn shape)', () => {
    expect(() =>
      NPCAuthoredSchema.parse({
        id: 'pc_aryn',
        name: 'Aryn Vale',
        controller: 'human',
        class: 'Rogue',
        level: 1,
        hp: 16,
        max_hp: 16,
        ac: 14,
        saves: { fort: 3, ref: 6, will: 4 },
        ability_scores: { str: 10, dex: 18, con: 12, int: 14, wis: 12, cha: 13 },
        skills: { perception: 5, stealth: 7 },
        inventory: [],
        equipment: [{ name: 'Shortsword', slot: 'main_hand' }],
        secrets: [],
        hidden_agenda: null,
        background: 'A former city runner.',
      }),
    ).not.toThrow();
  });

  it('accepts a stub NPC (antagonist_a shape)', () => {
    expect(() =>
      NPCAuthoredSchema.parse({
        id: 'antagonist_a',
        name: '[Unnamed — generated on reveal]',
        role: 'cult cell leader',
        lives_in: null,
        faction_id: 'cult_of_red_sigil',
        voice_register: null,
        stub: true,
      }),
    ).not.toThrow();
  });

  it('rejects valence outside -3..+3 in seed_memories', () => {
    expect(() =>
      NPCAuthoredSchema.parse({
        id: 'test-npc',
        name: 'Test',
        seed_memories: [
          { summary: 'bad event', valence: -5, salience: 5, pinned: false },
        ],
      }),
    ).toThrow();
  });

  it('rejects salience outside 1..10 in seed_memories', () => {
    expect(() =>
      NPCAuthoredSchema.parse({
        id: 'test-npc',
        name: 'Test',
        seed_memories: [
          { summary: 'event', valence: 0, salience: 11, pinned: false },
        ],
      }),
    ).toThrow();
  });

  it('rejects extra top-level fields (strict mode)', () => {
    expect(() =>
      NPCAuthoredSchema.parse({ id: 'x', name: 'X', undocumented: true }),
    ).toThrow();
  });
});

// ─── LocationAuthoredSchema ───────────────────────────────────────────────────

describe('LocationAuthoredSchema', () => {
  it('accepts a minimal building location', () => {
    expect(() =>
      LocationAuthoredSchema.parse({ id: 'drunken_goose', type: 'building' }),
    ).not.toThrow();
  });

  it('accepts a region with null parent_id', () => {
    expect(() =>
      LocationAuthoredSchema.parse({
        id: 'region_greyhill',
        type: 'region',
        parent_id: null,
        biome: 'temperate_hills',
        coords: null,
      }),
    ).not.toThrow();
  });

  it('rejects an unknown location type', () => {
    expect(() =>
      LocationAuthoredSchema.parse({ id: 'x', type: 'dungeon' }),
    ).toThrow();
  });

  it('rejects extra fields (strict mode)', () => {
    expect(() =>
      LocationAuthoredSchema.parse({ id: 'x', type: 'building', secret_exit: true }),
    ).toThrow();
  });
});

// ─── FactionAuthoredSchema ────────────────────────────────────────────────────

describe('FactionAuthoredSchema', () => {
  it('accepts the cult_of_red_sigil shape', () => {
    expect(() =>
      FactionAuthoredSchema.parse({
        id: 'cult_of_red_sigil',
        name: 'The Cult of the Red Sigil',
        goal: 'Re-consecrate the old hill-shrine.',
        members: ['vellis', 'antagonist_a'],
      }),
    ).not.toThrow();
  });

  it('accepts a faction with empty members list', () => {
    expect(() =>
      FactionAuthoredSchema.parse({ id: 'empty_faction', name: 'Empty', goal: 'Goal', members: [] }),
    ).not.toThrow();
  });

  it('rejects a faction missing goal', () => {
    expect(() =>
      FactionAuthoredSchema.parse({ id: 'x', name: 'X', members: [] }),
    ).toThrow();
  });
});

// ─── BeatAuthoredSchema ───────────────────────────────────────────────────────

describe('BeatAuthoredSchema', () => {
  it('accepts the 01_arrival beat shape', () => {
    expect(() =>
      BeatAuthoredSchema.parse({
        id: '01_arrival',
        location_id: 'location_drunken_goose',
        title: 'Arrival at the Drunken Goose',
        npcs_present: ['barkeep_marta'],
        player_characters_present: ['pc_aryn'],
        dependencies: [],
      }),
    ).not.toThrow();
  });

  it('rejects a beat missing required id', () => {
    expect(() =>
      BeatAuthoredSchema.parse({ location_id: 'somewhere' }),
    ).toThrow();
  });

  it('rejects a beat missing required location_id', () => {
    expect(() =>
      BeatAuthoredSchema.parse({ id: '01_arrival' }),
    ).toThrow();
  });
});

// ─── ForeshadowSeedAuthoredSchema ─────────────────────────────────────────────

describe('ForeshadowSeedAuthoredSchema', () => {
  it('accepts the cult_symbol seed shape', () => {
    expect(() =>
      ForeshadowSeedAuthoredSchema.parse({
        id: 'foreshadow_cult_symbol',
        context_tags: ['cult_of_red_sigil', 'south_road', 'visual_marker'],
        pays_off_at_beat: '01_arrival',
      }),
    ).not.toThrow();
  });

  it('accepts a seed without pays_off_at_beat (general foreshadowing)', () => {
    expect(() =>
      ForeshadowSeedAuthoredSchema.parse({
        id: 'general_seed',
        context_tags: ['ambiance'],
      }),
    ).not.toThrow();
  });

  it('rejects a seed missing context_tags', () => {
    expect(() =>
      ForeshadowSeedAuthoredSchema.parse({ id: 'x' }),
    ).toThrow();
  });
});

// ─── EncounterTableAuthoredSchema ─────────────────────────────────────────────

describe('EncounterTableAuthoredSchema', () => {
  it('accepts the forest_road encounter table shape', () => {
    expect(() =>
      EncounterTableAuthoredSchema.parse({
        id: 'encounter_forest_road',
        wired_to_edge: 'edge_south_road_into_forest',
        region_id: 'region_greyhill',
      }),
    ).not.toThrow();
  });

  it('rejects a table missing id', () => {
    expect(() =>
      EncounterTableAuthoredSchema.parse({ region_id: 'region_greyhill' }),
    ).toThrow();
  });
});

// ─── CampaignAuthoredSchema ───────────────────────────────────────────────────

describe('CampaignAuthoredSchema', () => {
  it('accepts the test_smallest campaign.yaml shape', () => {
    expect(() =>
      CampaignAuthoredSchema.parse({
        id: 'test_smallest',
        title: 'The Missing Villagers — Minimal',
        session_zero: {
          tone: 'heroic',
          lethality: 'standard',
          content_lines: [],
          veils: [],
        },
        opening_scene: 'drunken_goose/01_arrival',
      }),
    ).not.toThrow();
  });

  it('accepts an empty campaign object (all fields optional at root)', () => {
    expect(() => CampaignAuthoredSchema.parse({})).not.toThrow();
  });

  it('accepts campaign.md frontmatter shape', () => {
    expect(() =>
      CampaignAuthoredSchema.parse({
        tone: 'low-fantasy investigative',
        lethality: 'standard',
        est_sessions: 1,
        start_beat: '01_arrival',
        start_location: 'location_drunken_goose',
      }),
    ).not.toThrow();
  });
});
