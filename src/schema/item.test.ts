// src/schema/item.test.ts
import { describe, it, expect } from 'vitest';
import { ItemSchema, MundaneItemSchema, FlavorfulMundaneItemSchema, NarrativeItemSchema } from './item.js';

describe('MundaneItemSchema', () => {
  it('accepts a valid mundane item', () => {
    expect(() =>
      MundaneItemSchema.parse({
        id: 'item-shortsword-001',
        name: 'Shortsword',
        tier: 'mundane',
        description: 'A standard short blade.',
        weight_category: 'light',
        value_gp: 9,
      }),
    ).not.toThrow();
  });

  it('rejects a negative value_gp', () => {
    expect(() =>
      MundaneItemSchema.parse({
        id: 'item-001',
        name: 'Broken Thing',
        tier: 'mundane',
        description: 'x',
        weight_category: 'light',
        value_gp: -1,
      }),
    ).toThrow();
  });

  it('rejects an unknown weight_category', () => {
    expect(() =>
      MundaneItemSchema.parse({
        id: 'item-001',
        name: 'Widget',
        tier: 'mundane',
        description: 'x',
        weight_category: 'featherweight',
        value_gp: 0,
      }),
    ).toThrow();
  });

  it('accepts value_gp of 0 (free / given items)', () => {
    expect(() =>
      MundaneItemSchema.parse({
        id: 'item-rock',
        name: 'Rock',
        tier: 'mundane',
        description: 'A rock.',
        weight_category: 'negligible',
        value_gp: 0,
      }),
    ).not.toThrow();
  });
});

describe('FlavorfulMundaneItemSchema', () => {
  it('accepts a valid flavorful item with flavor_text', () => {
    expect(() =>
      FlavorfulMundaneItemSchema.parse({
        id: 'item-locket-001',
        name: "Engraved Locket",
        tier: 'flavorful_mundane',
        description: 'A small silver locket.',
        weight_category: 'negligible',
        value_gp: 5,
        flavor_text: "Engraved inside: 'M — forgive me'",
      }),
    ).not.toThrow();
  });

  it('rejects a flavorful item missing flavor_text', () => {
    expect(() =>
      FlavorfulMundaneItemSchema.parse({
        id: 'item-001',
        name: 'Locket',
        tier: 'flavorful_mundane',
        description: 'x',
        weight_category: 'light',
        value_gp: 5,
        // flavor_text omitted
      }),
    ).toThrow();
  });
});

describe('NarrativeItemSchema', () => {
  it('accepts a valid narrative item with full provenance', () => {
    expect(() =>
      NarrativeItemSchema.parse({
        id: 'item-coded-ledger',
        name: "Vellis's Coded Ledger",
        tier: 'narrative',
        description: 'A leather-bound ledger written in a market cipher.',
        weight_category: 'light',
        value_gp: 0,
        provenance: {
          creator: 'Vellis',
          purpose: 'Track cult deliveries covertly',
          cost: 'His freedom; the debt that trapped him',
          history_beats: ['Written under duress', 'Kept hidden from cult handlers'],
        },
        effect_description: 'Decodes to reveal Antagonist A\'s supply route.',
        flat_bonus: null,
        codex_entry_id: null,
      }),
    ).not.toThrow();
  });

  it('rejects a narrative item missing provenance', () => {
    expect(() =>
      NarrativeItemSchema.parse({
        id: 'item-001',
        name: 'Mystery Blade',
        tier: 'narrative',
        description: 'x',
        weight_category: 'medium',
        value_gp: 100,
        // provenance omitted
        effect_description: null,
        flat_bonus: null,
        codex_entry_id: null,
      }),
    ).toThrow();
  });
});

describe('ItemSchema (discriminated union)', () => {
  it('correctly discriminates all three tiers', () => {
    const mundane = {
      id: 'item-m', name: 'Dagger', tier: 'mundane', description: 'x',
      weight_category: 'light', value_gp: 2,
    };
    const flavorful = {
      id: 'item-f', name: 'Locket', tier: 'flavorful_mundane', description: 'x',
      weight_category: 'negligible', value_gp: 5, flavor_text: 'A name inside.',
    };
    const narrative = {
      id: 'item-n', name: 'Ledger', tier: 'narrative', description: 'x',
      weight_category: 'light', value_gp: 0,
      provenance: { creator: 'V', purpose: 'hide info', cost: 'freedom', history_beats: [] },
      effect_description: null, flat_bonus: null, codex_entry_id: null,
    };
    for (const item of [mundane, flavorful, narrative]) {
      expect(() => ItemSchema.parse(item)).not.toThrow();
    }
  });

  it('rejects an unknown tier value', () => {
    expect(() =>
      ItemSchema.parse({
        id: 'item-x',
        name: 'Weird Thing',
        tier: 'magical',
        description: 'x',
        weight_category: 'light',
        value_gp: 0,
      }),
    ).toThrow();
  });
});
