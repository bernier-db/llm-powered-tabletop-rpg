---
title: Canonical Terms Glossary
status: DRAFT
summary: Alphabetical definitions for every term used across the design, with canonical-use pointers and drift flags. One definition per term; update here when terminology changes.
related: [00-overview.md, 02-tools-orchestration.md, 03-rules-combat.md, 04-npc-memory.md, 05-director.md, 06-generation.md, 07-geography.md, 08-cross-cutting.md, 09-multimodality.md, 10-campaign-design.md, 11-dm-styles-tones.md, architecture/README.md]
updated: 2026-05-17
---

# Canonical Terms Glossary

One definition per term. When a term appears in multiple files, the **Canonical use** pointer wins. If you rename a term, update that file first, then update this entry.

---

### Actor

The universal abstraction for anything that can take a turn: player character, AI companion, NPC, or monster. Every Actor has the same shape (`id`, `name`, `sheet`, `controller`, optional `agent_profile`, optional `current_intent`). What differs is the `controller` field, not the type.

**Canonical use:** [`00-overview.md`](00-overview.md) §Actor abstraction

---

### Actor Abstraction

The design principle that collapses player characters, AI companions, NPCs, and monsters into one Actor shape, differing only in `controller`. This is what makes multiplayer "more actors with `controller: 'human'`" rather than a fundamentally different engine.

**Canonical use:** [`00-overview.md`](00-overview.md) §Actor abstraction

---

### Autonomy Gate

The filtering mechanism that governs whether a Companion agent speaks or acts spontaneously in a given beat. Evaluates three conditions in order: Does the event hit a drive or line? Is the player currently mid-spotlight? Is the Companion's recent floor-time over budget? Only if all three pass (hit drive/line, player not spotlighted, budget available) does the Companion take the beat.

**Canonical use:** [`architecture/party-shapes/01-solo-ai-companion.md`](architecture/party-shapes/01-solo-ai-companion.md) §How the gate decides

**Aliases / drift seen:** Appears as "autonomy gates" (plural, lowercase) in `02-tools-orchestration.md` and `00-overview.md`. Architecture diagram uses "Autonomy Gate" (singular, capitalized, as a component name). Recommend: use "autonomy gate" (lowercase) as the concept; "Autonomy Gate" only when referring to the architectural component box.

---

### Beat (campaign)

A named story node in the campaign skeleton — a discrete moment, revelation, or decision point. Each beat has dependencies (which prior beats must have fired), branches (which beats become available after), and 3+ clue-edges to ensure it is reachable from multiple paths.

**Canonical use:** [`05-director.md`](05-director.md) §Inputs; [`architecture/generation/01-campaign-authoring-validation.md`](architecture/generation/01-campaign-authoring-validation.md)

**Aliases / drift seen:** "One beat (pseudocode)" in `02-tools-orchestration.md` uses "beat" to mean a single turn-loop iteration, not a campaign node. Context disambiguates: campaign beat = story node; turn beat = one loop cycle.

---

### Beat (turn)

A single iteration of the turn loop: one actor's intent is received, resolved by the rules engine if needed, narrated, and state changes committed. Distinct from a campaign beat (story node).

**Canonical use:** [`02-tools-orchestration.md`](02-tools-orchestration.md) §One beat (pseudocode)

---

### Branch (campaign)

An outbound edge from a campaign beat — one of 2+ possible next beats that become available after a beat fires. Node-based design requires every beat to have multiple branches so the campaign is not a single-thread plot.

**Canonical use:** [`05-director.md`](05-director.md) §Inputs; [`architecture/generation/01-campaign-authoring-validation.md`](architecture/generation/01-campaign-authoring-validation.md) §Validation gates

---

### Canon (Codex)

The persistent, authoritative world record stored in SQLite + sqlite-vec. Every generated or authored entity that has been committed is "in canon." The codex is the vector-indexed slice of canon used for semantic recall. The LLM re-derives its knowledge of the world from the codex on every call; it does not remember canon across calls.

**Canonical use:** [`06-generation.md`](06-generation.md) §Canon preservation rule

**Aliases / drift seen:** "codex" (lower-case) used interchangeably with "canon" in several places. Recommend: **codex** = the sqlite-vec index + stored entries (the retrieval artifact); **canon** = the broader concept of what has been established as true. Both terms are in active use; keep both but do not conflate.

---

### Canon Preservation Rule

The invariant that every generation prompt must begin with a retrieval pass from the codex, so the LLM operates on established facts rather than re-inventing the world. Violation produces long-campaign contradictions (rivers move, NPCs rename themselves, symbols change meaning).

**Canonical use:** [`06-generation.md`](06-generation.md) §Canon preservation rule

---

### Cold Recall

Retrieving entries from the codex (sqlite-vec) via semantic vector search when the needed context is not in hot or warm memory. Triggered explicitly by an agent via `query_codex`. Results are injected into the prompt under "Relevant cold recall."

**Canonical use:** [`architecture/backstage/02-memory-tiers-summarizer.md`](architecture/backstage/02-memory-tiers-summarizer.md) §Sequence — cold recall on demand; [`00-overview.md`](00-overview.md) §Four layers

---

### Combat Agent

The agent that owns the floor from the moment initiative is rolled until `end_combat`. Responsible for announcing action budgets, requesting intent from each actor in initiative order, delegating resolution to the rules engine, and narrating outcomes in 2 sentences per turn. The DM agent does not narrate combat beats while the Combat agent holds the floor.

**Canonical use:** [`00-overview.md`](00-overview.md) §Agent layout; [`03-rules-combat.md`](03-rules-combat.md) §Per-turn flow; [`architecture/core-loops/02-combat-encounter.md`](architecture/core-loops/02-combat-encounter.md)

**Aliases / drift seen:** Called "Combat" (short form) in the agent layout table in `00-overview.md`. No "Combat orchestrator" usage found anywhere in the design — that variant does not exist. Use "Combat agent" as the canonical name.

---

### Companion

A party-facing NPC controlled by an agent rather than a human, with autonomy gates governing when it speaks or acts. Unlike a pure NPC actor (spawned per encounter), a Companion is a persistent party member with drives, lines, and a spotlight budget. The Companion agent reads party-public state plus its own sheet.

**Canonical use:** [`00-overview.md`](00-overview.md) §Agent layout; [`architecture/party-shapes/01-solo-ai-companion.md`](architecture/party-shapes/01-solo-ai-companion.md)

---

### Content Lines

Hard limits set in session zero — topics or content types that will never appear in the campaign. Distinct from veils (which may appear but happen off-screen). Every agent reads content lines and filters against them at both generation and output time.

**Canonical use:** [`08-cross-cutting.md`](08-cross-cutting.md) §Session zero; [`11-dm-styles-tones.md`](11-dm-styles-tones.md) §5 Safety / consent tooling

**Aliases / drift seen:** Called "lines" (short form) in `11-dm-styles-tones.md` §5. Use "content lines" in engine contexts to distinguish from Companion `line:` field (which is per-character, not per-session).

---

### Controller

The `controller` field on an Actor that determines who drives its decisions: `'human'` (player input), `'agent'` (an LLM agent), or `'dm'` (the DM agent). This field is the only structural difference between a player character and an NPC in the actor model.

**Canonical use:** [`00-overview.md`](00-overview.md) §Actor abstraction

---

### Director

The backstage planner that runs between scenes (never mid-scene, never during combat). Receives campaign skeleton, faction clocks, foreshadow queue, spotlight tracker, NPC schedule, and warm summary as inputs. Outputs a scene brief, faction clock ticks with visible evidence, foreshadow plant selections, and NPC movement notes. Does not speak to the player.

**Canonical use:** [`05-director.md`](05-director.md); [`architecture/backstage/01-director-between-scenes.md`](architecture/backstage/01-director-between-scenes.md)

---

### Director Brief

See **Scene Brief**.

---

### Disposition

An NPC's current emotional stance toward one or more PCs, computed as `base_disposition + Σ(valence-weighted memories)`. Injected into the NPC actor's prompt before they speak, as a per-PC score with a label (e.g., "Alice: -2 (suspicious)").

**Canonical use:** [`04-npc-memory.md`](04-npc-memory.md) §Read path

---

### DM Agent / Narrator

The primary agent that holds the floor during free play: frames scenes, narrates outcomes, adjudicates edge cases, and signals handoffs to other agents. Cannot call `roll()` directly — must request resolution via `check` or `attack`. Resumes scene framing after combat ends.

**Canonical use:** [`00-overview.md`](00-overview.md) §Agent layout; [`02-tools-orchestration.md`](02-tools-orchestration.md) §Agent permissioning matrix

**Aliases / drift seen:** "DM agent," "DM / Narrator Agent," "Narrator," and "DM" are used interchangeably across files. Recommend canonical form: **DM agent** in code/tool contexts; **Narrator** when describing the narrative role.

---

### Drives

Short structured tags on a Companion sheet that define what the character cares about (e.g., `drive: "redeem brother's memory"`). The autonomy gate checks drives each beat to determine whether the Companion should react. Distinct from `lines` (things the Companion won't do).

**Canonical use:** [`architecture/party-shapes/01-solo-ai-companion.md`](architecture/party-shapes/01-solo-ai-companion.md) §How the gate decides

---

### Encounter Table

A weighted table keyed to a region and terrain type. On each travel segment (or on location arrival, Director escalation, or explicit request), the engine rolls on the encounter table to determine whether an encounter fires and, if so, its type and threat level. Authored, not generated.

**Canonical use:** [`07-geography.md`](07-geography.md) §Schema (as `encounterTableId` on `LocationEdge`); [`06-generation.md`](06-generation.md) §What gets generated; [`architecture/generation/03-scenario-encounter-generation.md`](architecture/generation/03-scenario-encounter-generation.md)

---

### Faction Clock

A segmented progress bar (4–8 segments) tracking an antagonist faction's advance toward its goal. The Director ticks clocks during between-scene runs and injects visible evidence of ticks into the scene brief. Player inaction is a real cost — clocks tick without PC involvement.

**Canonical use:** [`05-director.md`](05-director.md) §Faction clocks; [`10-campaign-design.md`](10-campaign-design.md) §5 Faction & clock design

---

### Fail-Forward

The principle that failed rolls advance the story sideways rather than blocking it. The rules engine returns a "fail, but..." prompt to the DM agent when a roll fails. Implemented as a Director scaffold, not a DM prompt setting. The fail-forward menu is tone-shaped: gritty/horror defaults to hard fail; PbtA/pulp defaults to success with cost; cozy defaults to emotional cost.

**Canonical use:** [`05-director.md`](05-director.md) §Fail-forward by default; [`11-dm-styles-tones.md`](11-dm-styles-tones.md) §8.11

---

### Floor (holding the —)

The state of being the designated speaker/narrator for the current beat. Only one agent holds the floor at a time; the Router is the only component that assigns and transfers it. An agent holding the floor narrates; other agents wait.

**Canonical use:** [`02-tools-orchestration.md`](02-tools-orchestration.md) §Handoffs; [`architecture/core-loops/01-solo-free-play.md`](architecture/core-loops/01-solo-free-play.md) §Conceptual view

**Aliases / drift seen:** The Router is labeled "floor-holder picker" in the solo free play diagram. "Floor-holder" does not appear as a standalone noun for an agent — it describes the state of holding the floor, not a component. No "active actor" or "who's speaking" drift found. Recommend: "holds the floor" (verb phrase) is canonical; avoid "floor-holder" as a noun for an agent.

---

### Foreshadow Queue / Foreshadow Seed

A table of planted hints ("seeds") waiting to be delivered into a scene. Each seed has context tags (where it fits naturally), a target payoff window (which beats it should precede), and a harvested flag. The Director selects 1–2 seeds per between-scene run that fit the current location/situation and writes them into the scene brief as "planted seeds."

**Canonical use:** [`05-director.md`](05-director.md) §Foreshadowing queue; [`10-campaign-design.md`](10-campaign-design.md) §11.2

**Aliases / drift seen:** Called "foreshadow queue" (the table/collection) and "foreshadow seed" (an individual entry). Both terms are stable and consistent across files.

---

### Four-Degree Outcome Ladder

The resolution scale borrowed from PF2e: critical failure / failure / success / critical success, triggered by landing ±10 from the DC on a d20 roll. The rules engine returns one of the four degrees; the DM agent uses it as a narrative hook.

**Canonical use:** [`03-rules-combat.md`](03-rules-combat.md) §Pathfinder-lightweight choices

---

### Generator Agent

The agent invoked on demand to create world content: locations, NPCs, encounters, items. Executes the two-layer pattern (procedural skeleton + LLM expansion) and commits the result to the codex. Has read access to the world bible and region context; write access is via generation tools only.

**Canonical use:** [`00-overview.md`](00-overview.md) §Agent layout; [`architecture/generation/02-entity-generation-pipeline.md`](architecture/generation/02-entity-generation-pipeline.md)

**Aliases / drift seen:** Called "Generator" in the agent layout table (`00-overview.md`), "Generator agent" in architecture diagrams, and the topic file is titled "World & NPC Generation Pipeline" (`06-generation.md`). The pipeline is the process; the Generator agent is the actor that runs it. Use "Generator agent" when referring to the agent; "generation pipeline" when referring to the process.

---

### Hot Memory

The verbatim transcript of the current scene, approximately the last 20 turns. Injected into every agent's prompt at priority 4 (below system/session state/director brief, above warm summary). Bounded by the summarizer: every K turns, the oldest hot content is compressed into warm.

**Canonical use:** [`00-overview.md`](00-overview.md) §Memory tiers; [`architecture/backstage/02-memory-tiers-summarizer.md`](architecture/backstage/02-memory-tiers-summarizer.md) §Conceptual view

---

### JIT (Just-in-Time Generation)

The generation cadence for content the party detours into unexpectedly: settlements, locations within a settlement, random travel encounters. Generated on arrival/engagement, committed to canon, and never regenerated thereafter.

**Canonical use:** [`06-generation.md`](06-generation.md) §Cadence

---

### Lazy Generation

The generation cadence for content that exists in the world but has not yet been engaged: NPCs not spoken to, rooms not opened, shop inventory not browsed. A placeholder reference exists; the full entity is generated only when a player interaction forces it.

**Canonical use:** [`06-generation.md`](06-generation.md) §Cadence; [`architecture/generation/03-scenario-encounter-generation.md`](architecture/generation/03-scenario-encounter-generation.md) §Sequence — lazy NPC engagement

---

### Lethality

A session-zero setting that controls how dangerous the campaign is for PCs: `cinematic` (PCs rarely die), `standard`, or `brutal` (PCs die). Implemented as a mechanical multiplier on HP, monster damage, and save DCs in the deterministic rules engine. Also controls resurrection availability.

**Canonical use:** [`08-cross-cutting.md`](08-cross-cutting.md) §Session zero; [`11-dm-styles-tones.md`](11-dm-styles-tones.md) §8.3

---

### Lines (Companion)

Hard rules on a Companion's sheet that define what the character will never do (e.g., `line: "won't harm the innocent"`). When a scene event violates a line, the autonomy gate fires at HIGH priority regardless of spotlight budget. Distinct from session-zero content lines (per-player, per-campaign).

**Canonical use:** [`architecture/party-shapes/01-solo-ai-companion.md`](architecture/party-shapes/01-solo-ai-companion.md)

---

### Location

A node in the spatial graph. Has a `type` (region / settlement / district / building / room / wilderness_zone), a `parentId` for hierarchical containment, optional coordinates, and optional encounter table. The party is simultaneously at every ancestor in their parent chain.

**Canonical use:** [`07-geography.md`](07-geography.md) §Schema

---

### Location Edge

A directed (or bidirectional) edge in the spatial graph connecting two Locations. Carries distance, per-mode travel time, terrain, danger level, optional gating requirements, direction, and optional encounter table reference.

**Canonical use:** [`07-geography.md`](07-geography.md) §Schema

---

### Memory Tiers

The three-layer engine memory system: **hot** (verbatim current scene), **warm** (compressed session summary), **cold** (codex entries from prior sessions, recalled via vector search). Distinct from NPC memory, which is a separate structured store.

**Canonical use:** [`00-overview.md`](00-overview.md) §Memory tiers; [`architecture/backstage/02-memory-tiers-summarizer.md`](architecture/backstage/02-memory-tiers-summarizer.md)

---

### NPC Actor / NPC Agent

An agent instantiated per named NPC when the DM defers substantial dialogue to that NPC. Operates with a redacted view of the world (sees only what the NPC plausibly knows), can only produce dialogue and proposed actions, never narrates the scene. The DM agent resumes framing after the NPC returns its turn.

**Canonical use:** [`00-overview.md`](00-overview.md) §Agent layout; [`02-tools-orchestration.md`](02-tools-orchestration.md) §Agent permissioning matrix; [`architecture/core-loops/01-solo-free-play.md`](architecture/core-loops/01-solo-free-play.md) §When the DM defers to an NPC

**Aliases / drift seen:** "NPC actor" and "NPC agent" are used interchangeably. Recommend: **NPC actor** when emphasizing the actor-abstraction role (it IS an Actor); **NPC agent** when emphasizing the LLM agent running it.

---

### NPC Memory

Per-NPC structured records of interactions with the party, stored in the `npc_memories` table. Each entry has a summary, valence, salience, recall strength, related actor IDs, pinned flag, and timestamp. Separate from engine memory tiers; this is NPC-scoped, not session-scoped.

**Canonical use:** [`04-npc-memory.md`](04-npc-memory.md) §Schema

---

### Pacing Call

A Director output field in the scene brief: `"escalate"` / `"breather"` / `"hold"`. Signals the desired narrative energy for the upcoming scene. When `"escalate"`, encounter table rolls are biased toward higher-threat results; when `"breather"`, away from combat.

**Canonical use:** [`05-director.md`](05-director.md) §Pacing call; [`architecture/backstage/01-director-between-scenes.md`](architecture/backstage/01-director-between-scenes.md) §What the scene brief actually contains

---

### Party Movement

The `move_party()` flow: five stages — reachability check, pathfinding (player picks preference: shortest/safest/fastest), per-segment loop (time advance + encounter roll + narration), Director hook on large time advances, and arrival framing (first-visit vs. return-visit).

**Canonical use:** [`07-geography.md`](07-geography.md) §move_party() flow; [`architecture/travel/01-party-movement-flow.md`](architecture/travel/01-party-movement-flow.md)

---

### Pinned Memory

An NPC memory entry marked `pinned: true`, exempt from decay. Set at write-time by the DM for high-intensity events (betrayals, life-saving, oath-breaking). Pinned memories are always included in the top-K selection regardless of recency.

**Canonical use:** [`04-npc-memory.md`](04-npc-memory.md) §Decay

---

### Procedural Skeleton

Stage 1 of the two-layer generation pattern: weighted table rolls that produce structural facts about an entity (size, industry, government, traits, name seed, secret) before the LLM sees anything. The LLM never runs stage 1 — it receives the result.

**Canonical use:** [`06-generation.md`](06-generation.md) §Two-layer pattern; [`architecture/generation/02-entity-generation-pipeline.md`](architecture/generation/02-entity-generation-pipeline.md) §Conceptual view

---

### Redacted View

The scoped, filtered version of world state that an NPC agent (or a player in multiplayer private actions) sees. Implemented in the tool layer, not in prompts. An NPC agent cannot see PC secrets, inventory, or knowledge the NPC character would not plausibly have.

**Canonical use:** [`02-tools-orchestration.md`](02-tools-orchestration.md) §Key invariants; [`architecture/core-loops/01-solo-free-play.md`](architecture/core-loops/01-solo-free-play.md) §Conceptual view

---

### Reference Integrity

Validation gate 3 in the campaign loader: every NPC ID, location ID, and faction ID referenced in authored markdown must resolve to an existing entity. A campaign that fails reference integrity is rejected at load time with a file:line report.

**Canonical use:** [`architecture/generation/01-campaign-authoring-validation.md`](architecture/generation/01-campaign-authoring-validation.md) §Validation gates

---

### Region

A Location of type `'region'` in the spatial graph — a large-scale geographic container (kingdom, province, wilderness area). Regions are the parent of settlements in the `parentId` chain. Region-level events (war, weather, faction advance) affect all child locations.

**Canonical use:** [`07-geography.md`](07-geography.md) §Schema; [`06-generation.md`](06-generation.md) §What gets generated

---

### Relationships Table

An adjacency-list SQL table encoding the "graph" of entity relationships — who knows whom, faction memberships, NPC-to-location ties, inter-NPC bonds. Used instead of a graph database (Neo4j etc.) because most queries are 1–2 hops and the SQL join is sufficient.

**Canonical use:** [`01-storage.md`](01-storage.md) §The layout; [`10-campaign-design.md`](10-campaign-design.md) §11.1

---

### Router

The infrastructure component that decides who holds the floor at any given moment. Accepts input from players (or other agents), queues concurrent inputs in multiplayer, and signals handoffs via `defer_to(npc_id)` or by triggering the combat handoff. The only component that assigns the floor.

**Canonical use:** [`02-tools-orchestration.md`](02-tools-orchestration.md) §Handoffs; [`architecture/core-loops/01-solo-free-play.md`](architecture/core-loops/01-solo-free-play.md) §Conceptual view

---

### Rules Engine

The deterministic dice and resolution layer. The LLM calls `check`, `attack`, `cast_spell`, `apply_damage` — the rules engine rolls dice, applies modifiers, and returns a four-degree outcome. The rules engine is also where faction clock advancement and tension pool mechanics live to ensure determinism.

**Canonical use:** [`00-overview.md`](00-overview.md) §Four layers; [`02-tools-orchestration.md`](02-tools-orchestration.md) §Tool surface; [`03-rules-combat.md`](03-rules-combat.md)

---

### Salience

An integer (1–10) on an NPC memory entry representing how important the event is to that specific NPC. Set at write-time by the DM agent. Used as a multiplier in the memory ranking formula `salience × recency_decay × relevance_to_present_actors`.

**Canonical use:** [`04-npc-memory.md`](04-npc-memory.md) §Schema

---

### Scene

A bounded narrative unit: one location, one set of actors, one dramatic context. Scenes have a `scene_id`, hot memory (verbatim transcript), and a scene brief at open. A scene ends on a `scene_break` signal from the DM agent, which triggers the Director's between-scene run.

**Canonical use:** [`02-tools-orchestration.md`](02-tools-orchestration.md) §Turn-loop state machine

---

### Scene Break

The signal (from DM agent via `next_scene`) that a scene has concluded and the Director should run. Triggers the hot→warm memory flush, Director between-scene run, and scene brief generation for the next scene.

**Canonical use:** [`02-tools-orchestration.md`](02-tools-orchestration.md) §Turn-loop state machine; [`architecture/backstage/01-director-between-scenes.md`](architecture/backstage/01-director-between-scenes.md) §When the Director runs

---

### Scene Brief

A short structured document the Director writes at the end of its between-scene run and the DM agent reads before its first narration token in the next scene. Contains: pressure (what changed since last look), pacing call, spotlight nudge, planted foreshadow seeds, NPC intersections, faction evidence, and fail-forward hooks.

**Canonical use:** [`05-director.md`](05-director.md) §Outputs; [`architecture/backstage/01-director-between-scenes.md`](architecture/backstage/01-director-between-scenes.md) §What the scene brief actually contains

**Aliases / drift seen:** The Director is sometimes called "Director brief" in passing. The scene brief is the Director's output document, not a synonym for the Director itself. Use "scene brief."

---

### Scenario

A self-contained scene: combat, parley, trap, discovery, or social tension event. Most scenarios are not pre-authored — they are generated JIT from a region/situation encounter table and dressed by the Generator agent with "why" and "texture" tied to current canon and Director hints.

**Canonical use:** [`architecture/generation/03-scenario-encounter-generation.md`](architecture/generation/03-scenario-encounter-generation.md) §Conceptual view

---

### Session Gateway

An infrastructure component introduced in the multiplayer architecture diagram: accepts connections from multiple front-ends (web, CLI, Discord), identifies which player maps to which actor, fans narration broadcasts back out with per-player redaction, and manages presence/reconnect. The Router and Tool Surface are downstream of the Gateway.

**Canonical use:** [`architecture/party-shapes/02-multiplayer-table.md`](architecture/party-shapes/02-multiplayer-table.md) §Conceptual view

**Aliases / drift seen:** Session Gateway appears **only** in `architecture/party-shapes/02-multiplayer-table.md`. It is not mentioned in any topic file (`02-tools-orchestration.md`, `08-cross-cutting.md`, `OPEN-QUESTIONS.md`, etc.). This is an architecture-introduced term that has not been adopted into the design prose. **Needs an adoption decision**: either add it to `02-tools-orchestration.md` as a multiplayer infrastructure component, or rename/replace it in the diagram with a term the topic files use (e.g., "session transport layer").

---

### Session Zero

A one-time setup step at campaign start where the player configures: tone, content lines, veils, lethality, pacing preference, and combat granularity. The resulting configuration is persisted and read by every agent on every call. Session zero is also where safety tooling (X-card, Stars & Wishes) is explained and consent is established.

**Canonical use:** [`08-cross-cutting.md`](08-cross-cutting.md) §Session zero; [`11-dm-styles-tones.md`](11-dm-styles-tones.md) §5 Safety / consent tooling

---

### Settlement

A Location of type `'settlement'` — a hamlet, village, town, or city. Child of a Region; parent of Districts, Buildings, and Wilderness Zones within or adjacent to it. Key settlements are authored upfront; unplanned ones are generated JIT when the party detours.

**Canonical use:** [`06-generation.md`](06-generation.md) §What gets generated; [`07-geography.md`](07-geography.md) §Schema

---

### Speech Sample / Voice Exemplar

A short text snippet in the NPC's own register, generated and stored at NPC creation time. Injected into the NPC actor's prompt to anchor voice consistency across invocations. Also embedded into the codex for retrieval.

**Canonical use:** [`06-generation.md`](06-generation.md) §Per-entity notes; [`architecture/core-loops/03-npc-reencounter-memory.md`](architecture/core-loops/03-npc-reencounter-memory.md) §Conceptual view

**Aliases / drift seen:** Called "speech sample" in `06-generation.md` and the generation pipeline diagram (as a field name); called "voice exemplar" in the NPC re-encounter architecture file and in tool-call sequences. Both terms refer to the same artifact. Recommend canonical field name: `speech_sample` (snake_case for DB/code); "voice exemplar" as the descriptive prose term. Files that need to align: `06-generation.md` and `architecture/core-loops/03-npc-reencounter-memory.md`.

---

### Spotlight Tracker

A Director-owned counter recording how many scenes each PC has been central in. Used by the Director to write spotlight nudge recommendations into the scene brief, and consulted by the autonomy gate when deciding whether the Companion should speak (the gate suppresses the Companion when the player has the spotlight).

**Canonical use:** [`05-director.md`](05-director.md) §Spotlight tracker; [`architecture/backstage/01-director-between-scenes.md`](architecture/backstage/01-director-between-scenes.md) §Inputs

---

### State Store

The runtime SQLite database that is the source of truth for all mutable game state: actor sheets, HP, conditions, inventory, scene transcripts, NPC memories, faction clocks, quests, relationships, roll log, and party position. The LLM never touches it directly — all reads and writes go through the tool surface.

**Canonical use:** [`00-overview.md`](00-overview.md) §Four layers; [`01-storage.md`](01-storage.md)

---

### Sub-location

A Location nested inside another — a room within a building, an encounter site within a wilderness zone. Generated JIT when the party enters and either kept permanently or disposed after the scene (temporary sub-locations, e.g., an undescribed clearing used for combat, may be discarded).

**Canonical use:** [`06-generation.md`](06-generation.md) §What gets generated; [`07-geography.md`](07-geography.md) §Zoom

---

### Subagent / Agent (engine sense)

In the engine's domain model, an "agent" is one of the six named LLM roles (DM, NPC actor, Combat, Companion, Director, Generator) that holds the floor or runs backstage. Distinct from the SDK/platform sense of "subagent." In engine design documents, "agent" always means one of the six roles unless the context explicitly says otherwise.

**Canonical use:** [`00-overview.md`](00-overview.md) §Agent layout

---

### Summarizer

A small/cheap model job that compresses hot memory into warm every K turns. Preserves: named entities introduced, decisions made, rolls and outcomes, emotional beats. Prunes: small talk, repeated descriptions, action-by-action combat detail (which is in the roll log). The summarizer is isolated from the DM agent's loop so it is independently testable.

**Canonical use:** [`08-cross-cutting.md`](08-cross-cutting.md) §Summarizer; [`architecture/backstage/02-memory-tiers-summarizer.md`](architecture/backstage/02-memory-tiers-summarizer.md)

---

### Three-Action Economy

PF2e's action economy model, adopted in full: each actor has 3 actions per turn with no move/bonus/action split. Common actions (Strike, Stride, Step, Cast, Raise Shield, Demoralize) cost 1–3 actions. The Combat agent announces the budget and tracks it per turn.

**Canonical use:** [`03-rules-combat.md`](03-rules-combat.md) §Pathfinder-lightweight choices

---

### Tone (session-zero)

A player-configured flavor tag for the campaign: heroic / gritty / horror / comedy / political / pulp / mystery / cozy / weird. Tone is distinct from DM style (how the GM relates to fiction and rules). Tone shapes prompt vocabulary, the fail-forward menu, lethality defaults, generation table weighting, and DM output guardrails.

**Canonical use:** [`08-cross-cutting.md`](08-cross-cutting.md) §Session zero; [`11-dm-styles-tones.md`](11-dm-styles-tones.md) §3 Tonal registers, §8.1

---

### Tool Surface

The layer of named functions (tools) through which all agents read from and write to the state store. No agent touches SQLite or sqlite-vec directly. The tool layer enforces per-agent permission scopes, redaction for NPC reads, and transactional writes with audit logging.

**Canonical use:** [`02-tools-orchestration.md`](02-tools-orchestration.md) §Tool surface

---

### Two-Layer Pattern

The universal generation discipline applied to every entity (NPC, settlement, dungeon, item, scenario): (1) procedural skeleton via weighted tables (no LLM); (2) canon retrieval + LLM expansion on a tightly-scoped prompt; (3) canon commit (SQLite + codex embedding). The LLM runs exactly once per entity, with full context.

**Canonical use:** [`06-generation.md`](06-generation.md) §The two-layer pattern; [`architecture/generation/02-entity-generation-pipeline.md`](architecture/generation/02-entity-generation-pipeline.md)

**Aliases / drift seen:** Named "two-layer pattern" in `06-generation.md`; the architecture diagram file is titled "Entity Generation Pipeline — Two-Layer Pattern." The pattern has three actual stages (skeleton / retrieval+expansion / commit) but is named for the two-layer conceptual split (procedural vs. LLM). The name is established; don't change it.

---

### Valence

An integer (-3 to +3) on an NPC memory entry representing the emotional weight of the event: positive = good experience for the NPC, negative = bad. Used in disposition computation and in ranking memories for inclusion in the NPC's prompt.

**Canonical use:** [`04-npc-memory.md`](04-npc-memory.md) §Schema

---

### Veil

A content category that may appear in the campaign but always happens off-screen ("fade to black"). Set per-player in session zero. Distinct from content lines, which block the content entirely. Implementation: the engine generates the narrative consequence but not the scene itself.

**Canonical use:** [`08-cross-cutting.md`](08-cross-cutting.md) §Session zero; [`11-dm-styles-tones.md`](11-dm-styles-tones.md) §5 Safety / consent tooling

---

### Voice Profile / Voice ID

The TTS configuration assigned to a named NPC or the DM narrator at generation time — a vendor-specific `voice_id` field on the Actor or Location, mapping to a TTS voice that matches the character (baritone warrior, child's pitch, raspy elder). The engine routes narration and dialogue to the correct TTS voice per line. Schema not yet finalized.

**Canonical use:** [`09-multimodality.md`](09-multimodality.md) §Text-to-speech

**Aliases / drift seen:** Called "voice profile" in `09-multimodality.md` summary and `voice_id` in the body text. These are the same concept at different levels of abstraction: `voice_profile` is the full configuration object; `voice_id` is the vendor identifier within it. Recommend defining the schema split when `09-multimodality.md` is deepened.

---

### Warm Memory

The compressed summary of the current session produced by the summarizer. Grows incrementally as the summarizer runs every K turns. Injected into agent prompts at priority 5 (below hot memory). Compacted into cold (codex) at session end.

**Canonical use:** [`00-overview.md`](00-overview.md) §Memory tiers; [`architecture/backstage/02-memory-tiers-summarizer.md`](architecture/backstage/02-memory-tiers-summarizer.md)

---

### Zone (combat position)

A coarse position descriptor used in combat instead of a grid: close / near / far / out-of-reach from any given anchor. Stored as the actor's position in the state store during combat. The Combat agent tracks zones; the rules engine uses them for range/flanking resolution.

**Canonical use:** [`03-rules-combat.md`](03-rules-combat.md) §Position; [`architecture/core-loops/02-combat-encounter.md`](architecture/core-loops/02-combat-encounter.md)

---

### Zoom (parent chain)

The hierarchical containment structure of the spatial graph: a party inside the Drunken Goose is simultaneously inside the Market District, Stonebridge, the Greyhill region, and the Kingdom of Vellis. The `get_location_context` tool returns the full parent chain for narration. Region-level events apply to all descendants; building-level events apply only to that building.

**Canonical use:** [`07-geography.md`](07-geography.md) §Zoom; [`architecture/travel/01-party-movement-flow.md`](architecture/travel/01-party-movement-flow.md) §Zoom — parent-chain narration

---

## Drift Report

The following terminology issues were found during the cross-file inventory. No files were edited — these are recommendations for the project owner to act on.

### 1. Session Gateway — architecture-introduced, not in topic files

**Issue:** "Session Gateway" appears only in `architecture/party-shapes/02-multiplayer-table.md`. It is absent from `02-tools-orchestration.md` (the canonical orchestration reference), `08-cross-cutting.md`, and `OPEN-QUESTIONS.md`.

**Recommendation:** Either add a "Session Gateway" section to `02-tools-orchestration.md` (under a "Multiplayer infrastructure" heading), or rename the component in the diagram to match a term the topic files use. The concept is real and needed; it just has no prose home yet.

---

### 2. Autonomy Gate — placement ambiguity

**Issue:** The autonomy gate is described as a gate/filter (a logic check, not a full agent) in `02-tools-orchestration.md` and `00-overview.md`. The architecture diagram (`architecture/party-shapes/01-solo-ai-companion.md`) shows it as a box labeled "Autonomy Gate" connected to the Router and Companion separately, implying it might be a distinct component. There is no explicit answer to "does the gate live inside the Router, inside the Companion agent, or as a separate process?"

**Recommendation:** The prose in `02-tools-orchestration.md` treats it as the Companion agent's own evaluation step, which is the cleanest model. Update the architecture diagram annotation to clarify it is Companion-internal, or add a note in `02-tools-orchestration.md` saying "the autonomy gate is evaluated by the Companion agent on each beat, not by the Router."

---

### 3. Combat agent vs. "Combat" — missing canonical capitalization

**Issue:** The agent is called "Combat" (bare noun) in the `00-overview.md` agent layout table and "Combat agent" in the architecture files and `03-rules-combat.md`. No "Combat orchestrator" usage was found anywhere — that drift does not exist.

**Recommendation:** Standardize to "Combat agent" throughout. Update the `00-overview.md` agent layout table to spell it "Combat agent" (it currently just says "Combat"). Low-impact change.

---

### 4. Generator vs. Generator agent vs. generation pipeline

**Issue:** "Generator" (bare noun) is used in the `00-overview.md` agent layout. "Generator agent" is used in architecture diagram labels. "Generation pipeline" or "NPC generation pipeline" is used in topic file titles and cross-references. These describe overlapping but distinct things: the **Generator agent** is the LLM actor; the **generation pipeline** is the three-stage process it runs; and the **two-layer pattern** is the discipline that shapes that process.

**Recommendation:** Adopt three distinct terms: "Generator agent" for the agent; "generation pipeline" for the end-to-end process (including procedural skeleton, which has no LLM); "two-layer pattern" for the design discipline. Update `00-overview.md` agent layout to say "Generator agent." No other changes needed — the architecture files already use "Generator agent."

---

### 5. Speech sample vs. voice exemplar — two names for one field

**Issue:** The NPC text sample stored at generation time is called "speech sample" in `06-generation.md` and the generation pipeline diagram (as a code-level field name), but "voice exemplar" in `architecture/core-loops/03-npc-reencounter-memory.md` and in tool-call sequences in `architecture/core-loops/01-solo-free-play.md`.

**Recommendation:** Pick one and align both files. Suggested: `speech_sample` as the database field name (already in use in the generation pipeline sequence); "voice exemplar" as the human-readable descriptive term. Files needing update: `architecture/core-loops/03-npc-reencounter-memory.md` should note the field name; `06-generation.md` should use "voice exemplar" in prose.

---

### 6. DM agent / Narrator — informal synonyms in active use

**Issue:** The primary narrating agent is called "DM (Narrator)," "DM agent," "DM / Narrator Agent," "Narrator," and just "DM" across different files. All refer to the same agent.

**Recommendation:** Adopt "DM agent" as the canonical identifier in all code/tool contexts (`controller: 'dm'`, tool names, permission tables). Use "Narrator" as the prose shorthand when describing the narrative role. No file changes are urgent; this is a style preference, not a contradiction.

---

### 7. "Beat" — dual meaning requiring context

**Issue:** "Beat" means two different things: a campaign story node (authored, with dependencies and branches) and a single turn-loop iteration. Both usages are established and consistent within their own contexts, but a reader new to the codebase could confuse them.

**Recommendation:** No rename needed — both are reasonable TTRPG vocabulary. Add a disambiguation note in the glossary (done above, under Beat (campaign) and Beat (turn)). Consider adding a note in `02-tools-orchestration.md` §One beat that clarifies "beat here = one turn-loop iteration, not a campaign beat."
