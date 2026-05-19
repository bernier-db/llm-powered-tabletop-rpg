import type { DB } from '../database.js';
import type {
  ActorId, LocationId, QuestId, FactionId,
  Actor, Location, Quest, Faction, Item, ItemId,
  ForeshadowSeed, ForeshadowSeedId,
  CodexEntry, CodexEntryId,
  RelationshipRow, RelationshipId,
} from '../../schema/index.js';

export interface CampaignRepository {
  getActor(id: ActorId): Actor | undefined;
  listActors(): Actor[];
  getLocation(id: LocationId): Location | undefined;
  listLocations(): Location[];
  getQuest(id: QuestId): Quest | undefined;
  listQuests(): Quest[];
  getFaction(id: FactionId): Faction | undefined;
  listFactions(): Faction[];
  getItem(id: ItemId): Item | undefined;
  listItems(): Item[];
  getForeshadowSeed(id: ForeshadowSeedId): ForeshadowSeed | undefined;
  listForeshadowSeeds(): ForeshadowSeed[];
  getCodexEntry(id: CodexEntryId): CodexEntry | undefined;
  listCodexEntries(): CodexEntry[];
  getRelationship(id: RelationshipId): RelationshipRow | undefined;
  listRelationships(entityId: string): RelationshipRow[];
}

interface ActorRow {
  id: string; name: string; controller: string; location_id: string | null;
  combat_zone: string | null; sheet_json: string; agent_profile_json: string | null;
  inventory_json: string; equipped_json: string; current_intent_json: string | null;
  voice_id: string | null; is_player_character: number; description: string;
}

function rowToActor(r: ActorRow): Actor {
  return {
    id: r.id, name: r.name, controller: r.controller,
    location_id: r.location_id, combat_zone: r.combat_zone,
    sheet: JSON.parse(r.sheet_json),
    agent_profile: r.agent_profile_json ? JSON.parse(r.agent_profile_json) : undefined,
    inventory: JSON.parse(r.inventory_json),
    equipped: JSON.parse(r.equipped_json),
    current_intent: r.current_intent_json ? JSON.parse(r.current_intent_json) : null,
    voice_id: r.voice_id ?? undefined,
    is_player_character: r.is_player_character === 1,
  } as Actor;
}

interface LocationRow {
  id: string; name: string; type: string; parent_id: string | null;
  biome: string | null; description: string; coords_json: string | null;
  encounter_table_id: string | null; codex_entry_id: string | null;
}

function rowToLocation(r: LocationRow): Location {
  return {
    id: r.id, name: r.name, type: r.type, parent_id: r.parent_id,
    biome: r.biome, description: r.description,
    coords: r.coords_json ? JSON.parse(r.coords_json) : null,
    encounter_table_id: r.encounter_table_id,
    codex_entry_id: r.codex_entry_id,
  } as Location;
}

export function createCampaignRepository(db: DB): CampaignRepository {
  return {
    getActor(id) {
      const r = db.prepare('SELECT * FROM actors WHERE id = ?').get(id) as ActorRow | undefined;
      return r ? rowToActor(r) : undefined;
    },
    listActors() {
      return (db.prepare('SELECT * FROM actors').all() as ActorRow[]).map(rowToActor);
    },
    getLocation(id) {
      const r = db.prepare('SELECT * FROM locations WHERE id = ?').get(id) as LocationRow | undefined;
      return r ? rowToLocation(r) : undefined;
    },
    listLocations() {
      return (db.prepare('SELECT * FROM locations').all() as LocationRow[]).map(rowToLocation);
    },
    getQuest(id) {
      const r = db.prepare('SELECT * FROM quests WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      return r ? rowToQuest(r) : undefined;
    },
    listQuests() {
      return (db.prepare('SELECT * FROM quests').all() as Record<string, unknown>[]).map(rowToQuest);
    },
    getFaction(id) {
      const r = db.prepare('SELECT * FROM factions WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      return r ? rowToFaction(r) : undefined;
    },
    listFactions() {
      return (db.prepare('SELECT * FROM factions').all() as Record<string, unknown>[]).map(rowToFaction);
    },
    getItem(id) {
      const r = db.prepare('SELECT * FROM items WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      return r ? rowToItem(r) : undefined;
    },
    listItems() {
      return (db.prepare('SELECT * FROM items').all() as Record<string, unknown>[]).map(rowToItem);
    },
    getForeshadowSeed(id) {
      const r = db.prepare('SELECT * FROM foreshadow_seeds WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      return r ? rowToSeed(r) : undefined;
    },
    listForeshadowSeeds() {
      return (db.prepare('SELECT * FROM foreshadow_seeds').all() as Record<string, unknown>[]).map(rowToSeed);
    },
    getCodexEntry(id) {
      const r = db.prepare('SELECT * FROM codex_entries WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      return r ? rowToCodex(r) : undefined;
    },
    listCodexEntries() {
      return (db.prepare('SELECT * FROM codex_entries').all() as Record<string, unknown>[]).map(rowToCodex);
    },
    getRelationship(id) {
      const r = db.prepare('SELECT * FROM relationships WHERE id = ?').get(id) as Record<string, unknown> | undefined;
      return r ? rowToRelationship(r) : undefined;
    },
    listRelationships(entityId) {
      return (db.prepare(
        'SELECT * FROM relationships WHERE subject_id = ? OR object_id = ?',
      ).all(entityId, entityId) as Record<string, unknown>[]).map(rowToRelationship);
    },
  };
}

function rowToQuest(r: Record<string, unknown>): Quest {
  return {
    id: r['id'], title: r['title'], description: r['description'],
    status: r['status'],
    related_actor_ids: JSON.parse(r['related_actor_ids_json'] as string),
    related_faction_ids: JSON.parse(r['related_faction_ids_json'] as string),
    beats: JSON.parse(r['beats_json'] as string),
    started_at: r['started_at'] ?? null,
    completed_at: r['completed_at'] ?? null,
    source_beat_id: r['source_beat_id'] ?? null,
  } as Quest;
}

function rowToFaction(r: Record<string, unknown>): Faction {
  return {
    id: r['id'], name: r['name'], goal: r['goal'],
    member_ids: JSON.parse(r['member_ids_json'] as string),
    clock: r['clock_json'] ? JSON.parse(r['clock_json'] as string) : null,
    disposition_toward_party: r['disposition_toward_party'],
    disposition_label: r['disposition_label'] ?? null,
    codex_entry_id: r['codex_entry_id'] ?? null,
  } as Faction;
}

function rowToItem(r: Record<string, unknown>): Item {
  const base = {
    id: r['id'], name: r['name'], tier: r['tier'],
    description: r['description'],
    weight_category: r['weight_category'], value_gp: r['value_gp'],
  };
  if (r['tier'] === 'narrative') {
    return {
      ...base,
      provenance: JSON.parse(r['provenance_json'] as string),
      effect_description: r['effect_description'] ?? null,
      flat_bonus: r['flat_bonus'] ?? null,
      codex_entry_id: r['codex_entry_id'] ?? null,
    } as Item;
  }
  if (r['tier'] === 'flavorful_mundane') {
    return { ...base, flavor_text: r['flavor_text'] } as Item;
  }
  return base as Item;
}

function rowToSeed(r: Record<string, unknown>): ForeshadowSeed {
  return {
    id: r['id'], title: r['title'], description: r['description'],
    context_tags: JSON.parse(r['context_tags_json'] as string),
    suggested_placement: r['suggested_placement'],
    pays_off_at_beat: r['pays_off_at_beat'] ?? null,
    harvested: r['harvested'] === 1,
    first_planted_in_scene: r['first_planted_in_scene'] ?? null,
    priority: r['priority'], created_at: r['created_at'],
  } as ForeshadowSeed;
}

function rowToCodex(r: Record<string, unknown>): CodexEntry {
  return {
    id: r['id'], entity_id: r['entity_id'] ?? null,
    entity_type: r['entity_type'], summary: r['summary'],
    embedding_id: r['embedding_id'] ?? null,
    metadata: JSON.parse(r['metadata_json'] as string),
    world_time: r['world_time'] ?? null,
    written_at: r['written_at'],
  } as CodexEntry;
}

function rowToRelationship(r: Record<string, unknown>): RelationshipRow {
  return {
    id: r['id'], subject_id: r['subject_id'], subject_kind: r['subject_kind'],
    object_id: r['object_id'], object_kind: r['object_kind'],
    relation_type: r['relation_type'],
    description: r['description'] ?? null,
    strength: r['strength'] ?? null,
    is_public: r['is_public'] === 1,
    established_at: r['established_at'] ?? null,
    created_at: r['created_at'],
  } as RelationshipRow;
}
