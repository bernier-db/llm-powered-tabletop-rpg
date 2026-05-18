// src/schema/location.test.ts
import { describe, it, expect } from 'vitest';
import { LocationSchema, LocationEdgeSchema, PartyMovementLogSchema } from './location.js';

const validLocation = {
  id: 'location_drunken_goose',
  name: 'The Drunken Goose',
  type: 'building' as const,
  parent_id: 'settlement_stonebridge',
  biome: null,
  description: 'A low-ceilinged tavern smelling of tallow and old ale.',
  coords: null,
  encounter_table_id: null,
  codex_entry_id: null,
};

const validEdge = {
  id: 'edge_goose_to_market',
  from_id: 'location_drunken_goose',
  to_id: 'location_market_district',
  bidirectional: true,
  direction: 'SE' as const,
  distance: 80,
  travel_time: { foot: 2, horse: 2 },
  terrain: 'urban' as const,
  danger_level: 0 as const,
  requires: null,
  encounter_table_id: null,
};

describe('LocationSchema', () => {
  it('accepts a valid building location', () => {
    expect(() => LocationSchema.parse(validLocation)).not.toThrow();
  });

  it('accepts a region with null parent_id (root of hierarchy)', () => {
    expect(() =>
      LocationSchema.parse({
        ...validLocation,
        id: 'region_greyhill',
        type: 'region',
        parent_id: null,
        biome: 'temperate_hills',
      }),
    ).not.toThrow();
  });

  it('accepts all six location types', () => {
    const types = ['region', 'settlement', 'district', 'building', 'room', 'wilderness_zone'] as const;
    for (const type of types) {
      expect(() => LocationSchema.parse({ ...validLocation, type })).not.toThrow();
    }
  });

  it('rejects an unknown location type', () => {
    expect(() => LocationSchema.parse({ ...validLocation, type: 'dungeon' })).toThrow();
  });

  it('rejects a location missing description', () => {
    const { description: _d, ...noDesc } = validLocation;
    expect(() => LocationSchema.parse(noDesc)).toThrow();
  });
});

describe('LocationEdgeSchema', () => {
  it('accepts a valid bidirectional urban edge', () => {
    expect(() => LocationEdgeSchema.parse(validEdge)).not.toThrow();
  });

  it('accepts a wilderness edge with boat travel time', () => {
    expect(() =>
      LocationEdgeSchema.parse({
        ...validEdge,
        id: 'edge_river_crossing',
        terrain: 'water',
        travel_time: { foot: 60, horse: 60, boat: 15 },
        danger_level: 1,
      }),
    ).not.toThrow();
  });

  it('rejects an unknown terrain type', () => {
    expect(() =>
      LocationEdgeSchema.parse({ ...validEdge, terrain: 'swamp' }),
    ).toThrow();
  });

  it('rejects danger_level of 5 (above max)', () => {
    expect(() =>
      LocationEdgeSchema.parse({ ...validEdge, danger_level: 5 }),
    ).toThrow();
  });

  it('rejects an unknown direction', () => {
    expect(() =>
      LocationEdgeSchema.parse({ ...validEdge, direction: 'UP' }),
    ).toThrow();
  });

  it('accepts direction: null (interior traversals)', () => {
    expect(() =>
      LocationEdgeSchema.parse({ ...validEdge, direction: null }),
    ).not.toThrow();
  });
});

describe('PartyMovementLogSchema', () => {
  it('accepts a valid movement log in progress (arrived_at null)', () => {
    expect(() =>
      PartyMovementLogSchema.parse({
        id: 'move-001',
        party_id: 'party-alpha',
        from_id: 'location_drunken_goose',
        to_id: 'location_market_district',
        started_at: Date.now(),
        arrived_at: null,
        path_taken: ['location_drunken_goose', 'location_market_district'],
        events_during_travel: [],
      }),
    ).not.toThrow();
  });

  it('accepts a completed movement log with travel events', () => {
    const now = Date.now();
    expect(() =>
      PartyMovementLogSchema.parse({
        id: 'move-002',
        party_id: 'party-alpha',
        from_id: 'location_south_road',
        to_id: 'location_market_district',
        started_at: now,
        arrived_at: now + 60000,
        path_taken: ['location_south_road', 'location_market_district'],
        events_during_travel: [
          {
            segment_from_id: 'location_south_road',
            segment_to_id: 'location_market_district',
            event_type: 'encounter',
            description: 'Three wolves skirted the road.',
            world_time: 'Day 3, midday',
          },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects a movement log missing party_id', () => {
    expect(() =>
      PartyMovementLogSchema.parse({
        id: 'move-003',
        from_id: 'a',
        to_id: 'b',
        started_at: Date.now(),
        arrived_at: null,
        path_taken: [],
        events_during_travel: [],
      }),
    ).toThrow();
  });

  it('rejects an invalid travel event_type', () => {
    expect(() =>
      PartyMovementLogSchema.parse({
        id: 'move-004',
        party_id: 'party-alpha',
        from_id: 'a',
        to_id: 'b',
        started_at: Date.now(),
        arrived_at: null,
        path_taken: [],
        events_during_travel: [
          {
            segment_from_id: 'a',
            segment_to_id: 'b',
            event_type: 'combat', // not in the union
            description: 'x',
            world_time: 'Day 1',
          },
        ],
      }),
    ).toThrow();
  });
});
