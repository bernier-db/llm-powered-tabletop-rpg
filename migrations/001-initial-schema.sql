-- 001-initial-schema.sql
-- Initial schema for the RPG engine runtime database.
-- Mirrors Zod schemas in src/schema/. Prose text columns sit alongside structured columns (D012).

-- ===== Campaign data (read-only after campaign load) =====

CREATE TABLE actors (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  controller    TEXT NOT NULL CHECK(controller IN ('human','agent','dm')),
  location_id   TEXT,
  combat_zone   TEXT CHECK(combat_zone IN ('close','near','far','out-of-reach')),
  sheet_json    TEXT NOT NULL,  -- JSON: ActorSheet (hp, ac, abilities, skills, conditions)
  agent_profile_json TEXT,      -- JSON: AgentProfile (goals, personality, secrets, knowledge)
  inventory_json     TEXT NOT NULL DEFAULT '[]',  -- JSON array of ItemId
  equipped_json      TEXT NOT NULL DEFAULT '{}',  -- JSON record slot→ItemId
  current_intent_json TEXT,     -- JSON: PendingAction
  voice_id      TEXT,
  is_player_character INTEGER NOT NULL DEFAULT 0,
  description   TEXT NOT NULL DEFAULT ''
);

CREATE TABLE locations (
  id                  TEXT PRIMARY KEY,
  name                TEXT NOT NULL,
  type                TEXT NOT NULL CHECK(type IN ('region','settlement','district','building','room','wilderness_zone')),
  parent_id           TEXT REFERENCES locations(id),
  biome               TEXT,
  description         TEXT NOT NULL DEFAULT '',
  coords_json         TEXT,  -- JSON: LocationCoords
  encounter_table_id  TEXT,
  codex_entry_id      TEXT
);

CREATE TABLE location_edges (
  id              TEXT PRIMARY KEY,
  from_id         TEXT NOT NULL REFERENCES locations(id),
  to_id           TEXT NOT NULL REFERENCES locations(id),
  bidirectional   INTEGER NOT NULL DEFAULT 0,
  direction       TEXT CHECK(direction IN ('N','NE','E','SE','S','SW','W','NW')),
  distance        REAL NOT NULL,
  travel_time_json TEXT NOT NULL,  -- JSON: { foot, horse, boat? }
  terrain         TEXT NOT NULL CHECK(terrain IN ('road','trail','wilderness','mountain','water','underground','urban')),
  danger_level    INTEGER NOT NULL CHECK(danger_level BETWEEN 0 AND 4),
  requires_json   TEXT,  -- JSON: LocationEdgeRequires
  encounter_table_id TEXT
);

CREATE TABLE scenes (
  id              TEXT PRIMARY KEY,
  location_id     TEXT NOT NULL REFERENCES locations(id),
  actors_present_json TEXT NOT NULL DEFAULT '[]',  -- JSON array of ActorId
  status          TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','closed')),
  brief_json      TEXT,  -- JSON: SceneBrief
  opened_at       INTEGER NOT NULL,
  closed_at       INTEGER,
  warm_summary    TEXT
);

CREATE TABLE quests (
  id                TEXT PRIMARY KEY,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  status            TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','completed','failed','abandoned')),
  related_actor_ids_json   TEXT NOT NULL DEFAULT '[]',
  related_faction_ids_json TEXT NOT NULL DEFAULT '[]',
  beats_json        TEXT NOT NULL DEFAULT '[]',  -- JSON array of QuestBeat
  started_at        TEXT,  -- WorldTime
  completed_at      TEXT,  -- WorldTime
  source_beat_id    TEXT
);

CREATE TABLE factions (
  id                      TEXT PRIMARY KEY,
  name                    TEXT NOT NULL,
  goal                    TEXT NOT NULL DEFAULT '',
  member_ids_json         TEXT NOT NULL DEFAULT '[]',
  clock_json              TEXT,  -- JSON: FactionClock
  disposition_toward_party INTEGER NOT NULL DEFAULT 0,
  disposition_label       TEXT,
  codex_entry_id          TEXT
);

CREATE TABLE items (
  id               TEXT PRIMARY KEY,
  name             TEXT NOT NULL,
  tier             TEXT NOT NULL CHECK(tier IN ('mundane','flavorful_mundane','narrative')),
  description      TEXT NOT NULL DEFAULT '',
  weight_category  TEXT NOT NULL CHECK(weight_category IN ('light','medium','heavy','negligible')),
  value_gp         REAL NOT NULL DEFAULT 0,
  flavor_text      TEXT,  -- flavorful_mundane tier
  provenance_json  TEXT,  -- narrative tier: JSON ItemProvenance
  effect_description TEXT, -- narrative tier
  flat_bonus       INTEGER,  -- narrative tier
  codex_entry_id   TEXT      -- narrative tier
);

CREATE TABLE foreshadow_seeds (
  id                    TEXT PRIMARY KEY,
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL DEFAULT '',
  context_tags_json     TEXT NOT NULL DEFAULT '[]',
  suggested_placement   TEXT NOT NULL DEFAULT '',
  pays_off_at_beat      TEXT,
  harvested             INTEGER NOT NULL DEFAULT 0,
  first_planted_in_scene TEXT,
  priority              INTEGER NOT NULL DEFAULT 5 CHECK(priority BETWEEN 0 AND 10),
  created_at            INTEGER NOT NULL
);

CREATE TABLE codex_entries (
  id            TEXT PRIMARY KEY,
  entity_id     TEXT,
  entity_type   TEXT NOT NULL CHECK(entity_type IN ('actor','location','faction','item','quest','lore','session','relationship')),
  summary       TEXT NOT NULL,
  embedding_id  TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  world_time    TEXT,
  written_at    INTEGER NOT NULL
);

CREATE TABLE relationships (
  id            TEXT PRIMARY KEY,
  subject_id    TEXT NOT NULL,
  subject_kind  TEXT NOT NULL,
  object_id     TEXT NOT NULL,
  object_kind   TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  description   TEXT,
  strength      REAL CHECK(strength BETWEEN -1.0 AND 1.0),
  is_public     INTEGER NOT NULL DEFAULT 1,
  established_at TEXT,  -- WorldTime
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_relationships_subject ON relationships(subject_id, relation_type);
CREATE INDEX idx_relationships_object  ON relationships(object_id, relation_type);

-- ===== Session state (mutable) =====

CREATE TABLE game_state (
  id                TEXT PRIMARY KEY DEFAULT 'current',
  campaign_id       TEXT NOT NULL,
  session_id        TEXT NOT NULL,
  current_scene_id  TEXT REFERENCES scenes(id),
  turn_number       INTEGER NOT NULL DEFAULT 0,
  world_time        TEXT,
  state_json        TEXT NOT NULL DEFAULT '{}',  -- JSON: CampaignState (faction_clocks, spotlight, etc.)
  updated_at        INTEGER NOT NULL
);

CREATE TABLE turns (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id    TEXT NOT NULL,
  scene_id      TEXT NOT NULL REFERENCES scenes(id),
  turn_index    INTEGER NOT NULL,
  speaker_id    TEXT,
  speaker_role  TEXT NOT NULL CHECK(speaker_role IN ('dm','player','npc','companion','combat_agent','system')),
  text          TEXT NOT NULL,
  world_time    TEXT NOT NULL,
  wall_time     INTEGER NOT NULL,
  contains_roll_outcome         INTEGER NOT NULL DEFAULT 0,
  contains_entity_introduction  INTEGER NOT NULL DEFAULT 0,
  contains_decision             INTEGER NOT NULL DEFAULT 0,
  contains_emotional_beat       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_turns_session_scene ON turns(session_id, scene_id, turn_index);

-- ===== NPC memory =====

CREATE TABLE npc_memories (
  id                TEXT PRIMARY KEY,
  npc_id            TEXT NOT NULL REFERENCES actors(id),
  event_summary     TEXT NOT NULL,
  valence           INTEGER NOT NULL CHECK(valence BETWEEN -3 AND 3),
  salience          INTEGER NOT NULL CHECK(salience BETWEEN 1 AND 10),
  recall_strength   REAL NOT NULL DEFAULT 1.0 CHECK(recall_strength BETWEEN 0.0 AND 1.0),
  related_actor_ids_json TEXT NOT NULL DEFAULT '[]',
  pinned            INTEGER NOT NULL DEFAULT 0,
  ts                TEXT NOT NULL,  -- WorldTime
  created_at        INTEGER NOT NULL,
  vector_ref        TEXT
);
CREATE INDEX idx_npc_memories_npc ON npc_memories(npc_id, recall_strength DESC);

-- ===== Audit log (append-only) =====

CREATE TABLE roll_log (
  id              TEXT PRIMARY KEY,
  session_id      TEXT NOT NULL,
  seed_offset     INTEGER NOT NULL,
  scene_id        TEXT,
  actor_id        TEXT,
  roll_type       TEXT NOT NULL CHECK(roll_type IN ('check','attack','cast_spell','save','initiative','damage','healing','raw')),
  skill_or_attack TEXT,
  dc              INTEGER,
  total_modifier  INTEGER,
  raw_result      INTEGER NOT NULL,
  total_result    INTEGER NOT NULL,
  degree          TEXT CHECK(degree IN ('crit_fail','fail','success','crit_success')),
  context         TEXT NOT NULL DEFAULT '',
  rolled_at       INTEGER NOT NULL,
  world_time      TEXT
);
CREATE INDEX idx_roll_log_session ON roll_log(session_id, seed_offset);

CREATE TABLE tool_call_log (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL,
  scene_id      TEXT,
  agent_id      TEXT,
  tool_name     TEXT NOT NULL,
  args_json     TEXT NOT NULL DEFAULT '{}',
  before_hash   TEXT NOT NULL,
  after_hash    TEXT NOT NULL,
  rolled_back   INTEGER NOT NULL DEFAULT 0,
  ts            INTEGER NOT NULL
);
CREATE INDEX idx_tool_call_log_session ON tool_call_log(session_id, ts);

-- ===== Config =====

CREATE TABLE db_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
