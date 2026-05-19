import type { DB } from '../db/index.js';
import type { NPCAuthored, LocationAuthored, FactionAuthored, BeatAuthored, ForeshadowSeedAuthored } from '../schema/index.js';
import type { ParsedEntities } from './cross-reference-validator.js';
import { createLogger } from '../logger/index.js';

const log = createLogger('db-seeder');

interface ProseMap {
  locations: Map<string, string>;
}

export function seedDatabase(
  db: DB,
  entities: ParsedEntities,
  prose: ProseMap,
  campaignId: string,
): void {
  log.info('seeding database', {
    campaignId,
    npcs: entities.npcs.size,
    locations: entities.locations.size,
    factions: entities.factions.size,
    beats: entities.beats.size,
    foreshadowSeeds: entities.foreshadowSeeds.size,
  });

  db.pragma('foreign_keys = OFF');
  db.transaction(() => {
    seedLocations(db, entities.locations, prose.locations);
    seedActors(db, entities.npcs);
    seedFactions(db, entities.factions);
    seedForeshadowSeeds(db, entities.foreshadowSeeds);
    seedGameState(db, campaignId);
  })();
  db.pragma('foreign_keys = ON');

  log.info('database seeded successfully', { campaignId });
}

function seedLocations(
  db: DB,
  locations: Map<string, LocationAuthored>,
  proseMap: Map<string, string>,
): void {
  const stmt = db.prepare(`
    INSERT INTO locations (id, name, type, parent_id, biome, description, coords_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [id, loc] of locations) {
    const name = loc.name ?? id;
    const description = proseMap.get(id) ?? '';
    stmt.run(
      id,
      name,
      loc.type,
      loc.parent_id ?? null,
      loc.biome ?? null,
      description,
      loc.coords ? JSON.stringify(loc.coords) : null,
    );
    log.debug('seeded location', { id });
  }
}

function seedActors(db: DB, npcs: Map<string, NPCAuthored>): void {
  const stmt = db.prepare(`
    INSERT INTO actors (id, name, controller, location_id, sheet_json, agent_profile_json,
      inventory_json, equipped_json, voice_id, is_player_character, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const [id, npc] of npcs) {
    const sheet = {
      hp_current: npc.hp ?? 10,
      hp_max: npc.max_hp ?? npc.hp ?? 10,
      ac: npc.ac ?? 10,
      level: npc.level ?? 1,
      archetype: npc.class ?? 'commoner',
      ability_scores: npc.ability_scores ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      saves: npc.saves ?? { fort: 0, ref: 0, will: 0 },
      speed: 25,
      actions_remaining: 2,
      conditions: [],
      skills: npc.skills ?? {},
    };

    const agentProfile = (npc.personality || npc.secrets || npc.knowledge) ? {
      goals: [],
      personality: npc.personality ?? '',
      secrets: npc.secrets ?? [],
      knowledge: npc.knowledge ?? [],
      voice: npc.voice_register ?? '',
      tactics: '',
    } : null;

    const controller = npc.controller ?? 'agent';
    const isPc = controller === 'human' ? 1 : 0;

    const inventory = npc.inventory ? JSON.stringify(npc.inventory) : '[]';
    const equipped = npc.equipment
      ? JSON.stringify(Object.fromEntries(npc.equipment.map((e) => [e.slot, e.name])))
      : '{}';

    stmt.run(
      id,
      npc.name,
      controller,
      npc.lives_in ?? null,
      JSON.stringify(sheet),
      agentProfile ? JSON.stringify(agentProfile) : null,
      inventory,
      equipped,
      null,
      isPc,
      npc.role ?? '',
    );
    log.debug('seeded actor', { id, controller });
  }
}

function seedFactions(db: DB, factions: Map<string, FactionAuthored>): void {
  const stmt = db.prepare(`
    INSERT INTO factions (id, name, goal, member_ids_json, disposition_toward_party)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (const [id, faction] of factions) {
    stmt.run(
      id,
      faction.name,
      faction.goal,
      JSON.stringify(faction.members),
      0,
    );
    log.debug('seeded faction', { id });
  }
}

function seedForeshadowSeeds(
  db: DB,
  seeds: Map<string, ForeshadowSeedAuthored>,
): void {
  const stmt = db.prepare(`
    INSERT INTO foreshadow_seeds (id, title, context_tags_json, pays_off_at_beat, priority, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const [id, seed] of seeds) {
    stmt.run(
      id,
      id,
      JSON.stringify(seed.context_tags),
      seed.pays_off_at_beat ?? null,
      5,
      Date.now(),
    );
    log.debug('seeded foreshadow seed', { id });
  }
}

function seedGameState(db: DB, campaignId: string): void {
  const stmt = db.prepare(`
    INSERT INTO game_state (id, campaign_id, session_id, turn_number, state_json, updated_at)
    VALUES ('current', ?, ?, 0, '{}', ?)
  `);
  stmt.run(campaignId, `${campaignId}_s001`, Date.now());
  log.debug('seeded game state', { campaignId });
}
