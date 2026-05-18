// src/schema/actor.test.ts
import { describe, it, expect } from 'vitest';
import {
  ActorSchema,
  ActorSheetSchema,
  ConditionSchema,
  AgentProfileSchema,
  PendingActionSchema,
} from './actor.js';

// ─── Minimal valid shapes for use across tests ────────────────────────────────

const validSheet = {
  hp_current: 16,
  hp_max: 16,
  ac: 14,
  level: 1,
  archetype: 'Rogue',
  ability_scores: { str: 10, dex: 18, con: 12, int: 14, wis: 12, cha: 13 },
  saves: { fort: 3, ref: 6, will: 4 },
  speed: 25,
  actions_remaining: 3,
  conditions: [],
  skills: { perception: 5, stealth: 7 },
};

const validActor = {
  id: 'pc_aryn',
  name: 'Aryn Vale',
  sheet: validSheet,
  controller: 'human' as const,
  location_id: 'location_drunken_goose',
  combat_zone: null,
  inventory: [],
  equipped: {},
  agent_profile: undefined,
  current_intent: null,
  is_player_character: true,
};

// ─── ConditionSchema ──────────────────────────────────────────────────────────

describe('ConditionSchema', () => {
  it('accepts a condition with a name only (duration_rounds null = indefinite)', () => {
    expect(() => ConditionSchema.parse({ name: 'frightened', duration_rounds: null })).not.toThrow();
  });

  it('accepts a condition with severity and duration', () => {
    expect(() =>
      ConditionSchema.parse({ name: 'frightened', severity: 2, duration_rounds: 3 }),
    ).not.toThrow();
  });

  it('rejects a duration_rounds that is negative (below min 0)', () => {
    expect(() =>
      ConditionSchema.parse({ name: 'prone', severity: 0, duration_rounds: -1 }),
    ).toThrow();
  });

  it('rejects severity below 0', () => {
    expect(() =>
      ConditionSchema.parse({ name: 'frightened', severity: -1, duration_rounds: null }),
    ).toThrow();
  });
});

// ─── ActorSheetSchema ─────────────────────────────────────────────────────────

describe('ActorSheetSchema', () => {
  it('accepts a valid sheet', () => {
    expect(() => ActorSheetSchema.parse(validSheet)).not.toThrow();
  });

  it('rejects actions_remaining above 3 (three-action economy max)', () => {
    expect(() =>
      ActorSheetSchema.parse({ ...validSheet, actions_remaining: 4 }),
    ).toThrow();
  });

  it('rejects actions_remaining below 0', () => {
    expect(() =>
      ActorSheetSchema.parse({ ...validSheet, actions_remaining: -1 }),
    ).toThrow();
  });

  it('rejects level below 1', () => {
    expect(() => ActorSheetSchema.parse({ ...validSheet, level: 0 })).toThrow();
  });
});

// ─── AgentProfileSchema ───────────────────────────────────────────────────────

describe('AgentProfileSchema', () => {
  it('accepts a minimal valid agent profile', () => {
    expect(() =>
      AgentProfileSchema.parse({
        goals: ['find vellis'],
        personality: ['pragmatic'],
        speech_sample: 'Aye, she is a hard season.',
        secrets: ['witnessed the kidnapping'],
        knowledge: ['four farmhands are missing'],
      }),
    ).not.toThrow();
  });

  it('accepts profile with optional drives and lines', () => {
    expect(() =>
      AgentProfileSchema.parse({
        goals: ['protect the innocent'],
        personality: ['loyal'],
        speech_sample: 'I will not stand by.',
        secrets: [],
        knowledge: [],
        drives: [{ text: 'protect civilians' }],
        lines: [{ text: "won't betray allies" }],
      }),
    ).not.toThrow();
  });

  it('rejects profile missing speech_sample', () => {
    expect(() =>
      AgentProfileSchema.parse({
        goals: [],
        personality: [],
        secrets: [],
        knowledge: [],
        // speech_sample omitted
      }),
    ).toThrow();
  });

  it('rejects a profile with extra fields', () => {
    expect(() =>
      AgentProfileSchema.parse({
        goals: [],
        personality: [],
        speech_sample: 'x',
        secrets: [],
        knowledge: [],
        unknown_field: true,
      }),
    ).toThrow();
  });
});

// ─── PendingActionSchema ──────────────────────────────────────────────────────

describe('PendingActionSchema', () => {
  it('accepts a valid attack intent', () => {
    expect(() =>
      PendingActionSchema.parse({
        description: 'Aryn strikes the cultist with a shortsword',
        needs_check: false,
        is_attack: true,
        target_actor_id: 'cultist_01',
        weapon: 'shortsword',
        result: null,
        actions_cost: 1,
      }),
    ).not.toThrow();
  });

  it('rejects actions_cost of 0 (minimum is 1)', () => {
    expect(() =>
      PendingActionSchema.parse({
        description: 'free action',
        needs_check: false,
        is_attack: false,
        result: null,
        actions_cost: 0,
      }),
    ).toThrow();
  });

  it('rejects actions_cost above 3', () => {
    expect(() =>
      PendingActionSchema.parse({
        description: 'impossible 4-action',
        needs_check: false,
        is_attack: false,
        result: null,
        actions_cost: 4,
      }),
    ).toThrow();
  });

  it('accepts all four result degrees', () => {
    for (const degree of ['crit_fail', 'fail', 'success', 'crit_success'] as const) {
      expect(() =>
        PendingActionSchema.parse({
          description: 'check result',
          needs_check: true,
          skill: 'perception',
          dc: 15,
          is_attack: false,
          result: degree,
          actions_cost: 1,
        }),
      ).not.toThrow();
    }
  });
});

// ─── ActorSchema ──────────────────────────────────────────────────────────────

describe('ActorSchema', () => {
  it('accepts a valid PC actor', () => {
    expect(() => ActorSchema.parse(validActor)).not.toThrow();
  });

  it('accepts an NPC actor with agent_profile (no sheet required — NPCs may be sheet-less)', () => {
    // Design note: ActorSchema.sheet is optional because NPCs used only for narrative
    // (not combat) may not have mechanical sheets.
    const npc = {
      id: 'barkeep_marta',
      name: 'Marta Hoss',
      controller: 'agent',
      location_id: 'location_drunken_goose',
      combat_zone: null,
      inventory: [],
      equipped: {},
      current_intent: null,
      is_player_character: false,
    };
    expect(() => ActorSchema.parse(npc)).not.toThrow();
  });

  it('rejects an unknown controller value', () => {
    expect(() => ActorSchema.parse({ ...validActor, controller: 'robot' })).toThrow();
  });

  it('rejects an actor with an invalid combat_zone string', () => {
    expect(() =>
      ActorSchema.parse({ ...validActor, combat_zone: 'very-far' }),
    ).toThrow();
  });

  it('accepts combat_zone: null (actor is not in combat)', () => {
    expect(() => ActorSchema.parse({ ...validActor, combat_zone: null })).not.toThrow();
  });

  it('accepts all valid combat zones', () => {
    for (const zone of ['close', 'near', 'far', 'out-of-reach'] as const) {
      expect(() => ActorSchema.parse({ ...validActor, combat_zone: zone })).not.toThrow();
    }
  });
});
