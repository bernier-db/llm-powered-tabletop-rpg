---
title: Risks & Tripwires for Autonomous Implementation Agents
status: DRAFT
summary: 18 numbered rules an autonomous coding agent must not violate — ordered by severity of breakage — each with why, how to detect, and canonical source.
related: [02-tools-orchestration.md, 03-rules-combat.md, 06-generation.md, 07-geography.md, 08-cross-cutting.md, 01-storage.md, 04-npc-memory.md, 05-director.md, 10-campaign-design.md, 11-dm-styles-tones.md, architecture/backstage/02-memory-tiers-summarizer.md, architecture/party-shapes/01-solo-ai-companion.md]
updated: 2026-05-17
---

# Risks & Tripwires for Autonomous Implementation Agents

Rules an implementing agent must not violate. Read these before writing any engine code. Ordered roughly: the earlier the item, the harder it is to fix after the fact.

---

## 1. Lock the embedding model and vector dimension before writing the first row to sqlite-vec

**Why:** sqlite-vec stores raw float vectors. Switching embedding models mid-campaign changes the dimension or the semantic space, making every existing vector meaningless. There is no migration path short of re-embedding everything from source text — and for NPC memories the source text may be gone.

**How to detect:** `grep -r "new.*Embedder\|embed_model\|dimensions" src/` — confirm exactly one place sets these, at DB initialization, and that it reads from a locked config field that throws if changed after first use.

**Canonical source:** `01-storage.md` §sqlite-vec; `08-cross-cutting.md` §Deterministic RNG (same class of "lock before first use" discipline).

---

## 2. Every generation prompt must begin with a canon retrieval pass — no exceptions

**Why:** The LLM does not remember prior sessions. Without pulling the codex first, it re-invents NPCs, renames rivers, contradicts faction history, and changes symbol meanings. By session 8 the campaign is incoherent. This is explicitly called "the single most important rule" in `06-generation.md`.

**How to detect:** Every call path that invokes the Generator agent must pass a `canonSnapshot: CodexEntry[]` field (part of `GenerationRequest<T>`). Test: mock the codex query to throw — any generation call that does not propagate the error is violating this rule.

**Canonical source:** `06-generation.md` §Canon preservation rule; `architecture/generation/02-entity-generation-pipeline.md` §Canon preservation rule diagram.

---

## 3. The DM/Narrator agent must never call `roll()` directly — only `check`, `attack`, `cast_spell`

**Why:** Giving the LLM access to raw `roll()` means it can fudge outcomes by calling it multiple times or ignoring the result. The structural fix is that `roll()` is not in the DM's tool surface at all. Only the rules engine (called via the resolution tools) ever touches dice.

**How to detect:** `grep -r "roll(" src/agents/dm` should return zero hits. The DM's tool surface list in the tool router must not include `roll`.

**Canonical source:** `02-tools-orchestration.md` §Key invariants; `architecture/core-loops/01-solo-free-play.md` §Key invariants.

---

## 4. NPC agent reads must go through redacted views — redaction lives in the tool layer, not in the prompt

**Why:** If redaction is only a prompt instruction ("don't mention the PC's secrets"), a distracted or fine-tuned model will leak it. Redaction must be structural: the tool function `get_actor` returns different fields depending on `caller_agent_id`. NPCs physically cannot see PC inventory or secrets because the tool never returns those fields to them.

**How to detect:** `get_actor` (and any other state-read that touches actor data) must branch on `agent_type`. A test that calls `get_actor(pc_id)` from an NPC agent context and checks the return value must not contain `secrets`, `inventory`, or `hidden_agenda` fields.

**Canonical source:** `02-tools-orchestration.md` §Agent permissioning matrix; `architecture/core-loops/01-solo-free-play.md` §Key invariants.

---

## 5. One agent holds the floor at a time — only the Router picks the next speaker

**Why:** The "DM speaks, NPC speaks, DM speaks again in the same beat" failure mode produces schizophrenic output. It also means two agents are racing to call state-write tools simultaneously, creating race conditions. The Router is the only thing that grants and revokes floor-holding.

**How to detect:** No agent function should call another agent's `respond()` / `run()` / `stream()` directly. All agent invocations must go through `Router.grantFloor(agent_id)`. A test: confirm only one agent has `floor_held = true` at any point in the state store.

**Canonical source:** `02-tools-orchestration.md` §Handoffs; `architecture/core-loops/01-solo-free-play.md` conceptual diagram.

---

## 6. All state writes are transactional and audited — no bare SQL writes outside the tool surface

**Why:** If an agent or test helper writes directly to SQLite, bypassing the tool surface, the `state_log` audit trail breaks. Replay and deterministic testing both depend on being able to reconstruct session state from the log. Bare writes also skip validation and can corrupt HP below 0, set conditions without durations, etc.

**How to detect:** `grep -rn "db\.run\|db\.exec\|\.prepare(" src/` — every hit must be inside `src/tools/` or `src/store/`. Zero hits allowed in `src/agents/`, `src/director/`, `src/generator/`.

**Canonical source:** `02-tools-orchestration.md` §Key invariants ("All writes are transactional and audited"); `01-storage.md` §Authored vs runtime separation.

---

## 7. Authored markdown (`campaigns/`) is seed only — no write paths back to it during play

**Why:** Markdown is the version-controlled, shareable, forkable campaign artifact. Any write path back to it during play (e.g., updating NPC HP in the markdown file) would corrupt the source, break git-based sharing, and make saves non-reproducible. Runtime state lives exclusively in SQLite.

**How to detect:** `grep -rn "writeFile\|fs\.write\|appendFile" src/` — zero hits in any module that runs after campaign load. Markdown files are read-only after the loader seeds the DB.

**Canonical source:** `01-storage.md` §Authored vs runtime separation; `architecture/generation/01-campaign-authoring-validation.md` §Save / load interaction diagram.

---

## 8. Pin the RNG seed per session and log every roll to `roll_log` before consuming the result

**Why:** Without a seeded, logged RNG: (a) replay debugging is impossible, (b) the "rewind to before that roll" feature cannot work, (c) tests are non-deterministic. Every roll entry must include `session_id`, `seed_offset`, `actor_id`, `tool_name`, and `context` before the result is returned to the caller.

**How to detect:** The `roll()` function must write to `roll_log` as its first side-effect, before returning. A test that rolls and then checks `roll_log` must find a matching row. `grep -rn "Math\.random\|crypto\.randomInt" src/` should return zero hits — all randomness goes through the seeded RNG.

**Canonical source:** `08-cross-cutting.md` §Deterministic RNG per session.

---

## 9. The Director runs only between scenes — never mid-scene, never mid-turn

**Why:** The Director's job is backstage planning. If it runs mid-scene it can: (a) update faction clocks while the DM is mid-narration, creating state inconsistency; (b) inject a new scene brief that contradicts what the DM is currently saying; (c) break the "one agent holds the floor" invariant implicitly. Director output is a scene brief consumed by the DM at scene start, never injected mid-turn.

**How to detect:** The Director trigger must only fire on `scene_break` or `big_time_advance` events, not on `turn_end` or `beat_end`. Code review: `Director.run()` must not be callable from anywhere inside the per-turn loop. Add an assertion: `if (sceneState === 'active') throw new Error('Director called mid-scene')`.

**Canonical source:** `05-director.md` §When the Director runs; `architecture/backstage/01-director-between-scenes.md` state machine diagram.

---

## 10. Combat agent owns the floor from `start_combat` to `end_combat` — the DM does not narrate combat beats

**Why:** Two agents narrating combat interleaved produces contradictory outcomes (the DM says the orc is still standing; the Combat agent says it fell). Combat state (initiative, HP, conditions, zones) is the Combat agent's sole responsibility during an encounter. The DM resumes only after `end_combat` returns.

**How to detect:** In the turn-loop state machine, the `COMBAT_LOOP` state must route all narration to the Combat agent. `grep -rn "dm.narrate\|dmAgent.respond" src/combat/` should return zero hits. The DM is not in scope during combat.

**Canonical source:** `03-rules-combat.md` §Hand-off; `architecture/core-loops/02-combat-encounter.md` floor-holding state machine.

---

## 11. Tool arguments must be validated by Zod schemas, not by prompt instructions

**Why:** Prompt-level validation ("only pass valid skill names") is ignored whenever the LLM is confident or confused. Zod schemas run at the tool layer, before any state mutation, and throw before bad data can corrupt the store. This also means the validation is testable independent of the LLM.

**How to detect:** Every tool function must call `schema.parse(args)` (or equivalent) as its first line. `grep -rn "function.*tool\|registerTool" src/tools/` — each registered tool must have a corresponding Zod schema. A test that passes a malformed argument to any tool must throw before reaching any DB write.

**Canonical source:** `02-tools-orchestration.md` preamble; `OPEN-QUESTIONS.md` §Stack (`zod` listed as a required dependency).

---

## 12. The summarizer must preserve rolls + outcomes, named entities, decisions, and emotional beats — and prune small talk and action-by-action combat detail

**Why:** The summarizer is the only thing that keeps context windows bounded across long sessions. If it prunes the wrong things, the DM loses canon that can never be recovered (a named NPC introduced three scenes ago, a DC that was beaten, a relationship shift). If it fails to prune, context balloons and costs spike. The roll_log is the backstop for combat detail — the summarizer can safely drop it there.

**How to detect:** Eval test: run the summarizer on a scripted verbatim scene containing a named entity introduction, a crit success, a disposition shift, and 10 turns of corridor small talk. Assert: named entity present in output; roll outcome present; disposition shift present; small-talk turn count in output is < 2. Also assert: no action-by-action combat narration in warm summary (only final state).

**Canonical source:** `08-cross-cutting.md` §Summarizer; `architecture/backstage/02-memory-tiers-summarizer.md` §What gets preserved vs. pruned diagram.

---

## 13. The DM must never invent geography — all spatial answers come from graph queries

**Why:** A hallucinated mountain range, an invented road, or a river that moves between scenes breaks spatial consistency and, more critically, breaks the travel and encounter systems that depend on the graph. The tool surface has `get_neighbors`, `get_path`, `get_location_context`, and `describe_surroundings` specifically so the DM never needs to improvise geography.

**How to detect:** The DM's tool surface must include all four geography read tools. No geography-describing narration should be generated without a prior call to at least one of them in the same beat. Code review: if the DM agent generates text containing compass directions or location names, confirm the preceding tool calls include a geography query.

**Canonical source:** `07-geography.md` §DM-side discipline; `architecture/travel/01-party-movement-flow.md` §DM-side tool surface diagram.

---

## 14. Session-zero state (content lines, veils, tone, lethality) must be read by every agent on every scene — not just at startup

**Why:** If session-zero config is loaded once at startup and never re-checked, a model update, a mid-session config change, or a multi-campaign shared process can let content lines slip. The "two-layer" enforcement model (don't generate it; if generated, redact and regenerate) requires the config to be present at generation time, not just at boot.

**How to detect:** The context-budget layering specifies session-zero state as layer 2 (after system prompt, before everything else). Assert that the assembled prompt for any agent, at any scene, contains the session-zero block. A test: change a content line mid-session and confirm the next generation call respects it.

**Canonical source:** `08-cross-cutting.md` §Session zero; `11-dm-styles-tones.md` §8.8; `architecture/backstage/01-director-between-scenes.md` §Best DM practices scaffolds diagram (session-zero state reads by all agents).

---

## 15. Companion autonomy gates must consult the spotlight tracker before allowing spontaneous action — not just drives and lines

**Why:** A Companion that fires on every drive match steals scenes from the human player. The gate is three-part: (1) does this hit a drive or line? (2) is the player currently mid-spotlight? (3) has the Companion recently exceeded its floor-time budget? All three must pass. Missing the spotlight and budget checks produces an overbearing Companion that overshadows the PC.

**How to detect:** The `AutomonyGate.evaluate()` function must call `SpotlightTracker.isPlayerMidSpotlight()` and `SpotlightTracker.recentCompanionFloorTime()` — not just check `companion.drives` and `companion.lines`. A test: set player mid-spotlight = true and a drive match = true; gate must return `suppress`.

**Canonical source:** `architecture/party-shapes/01-solo-ai-companion.md` §How the gate decides diagram; `05-director.md` §Spotlight tracker.

---

## 16. Generated entities are permanent after canon commit — the LLM must never regenerate what already exists

**Why:** If the generation pipeline regenerates an NPC that already exists in the codex (e.g., because the caller forgot to check), the new version may contradict the old: different name, different voice, different secret. From that point the campaign has two versions of the same NPC in different memory paths.

**How to detect:** The `generate_npc` (and equivalent) tool must query `SELECT id FROM npcs WHERE id = ?` or a semantic dedup check before calling the LLM. If a match is found, return the stored entity. Test: call `generate_npc` twice with the same parent and role hint; confirm the second call returns the stored entity, not a new one.

**Canonical source:** `06-generation.md` §Canon commit ("Entity is now permanent. Future lookups return the stored version. The LLM never regenerates what already exists."); `architecture/generation/02-entity-generation-pipeline.md` §Sequence.

---

## 17. The quantum-ogre invariant: once the engine commits a fact to fiction, it cannot be retconned by subsequent generation

**Why:** Invalidating a player-deduced fact (a location they scouted, a clue they found, an NPC they met) destroys player trust and agency. This is the "quantum ogre" failure mode from `10-campaign-design.md`. The world-facts ledger is write-append only from the player's perspective.

**How to detect:** A `world_facts` table (or equivalent) must exist in the state schema, append-only during play. Any generation call that would produce a fact contradicting an existing `world_facts` entry must be rejected or constrained to add-only. Test: commit a fact (e.g., "the cult symbol is a red spiral"), then run a generation call for a new encounter in the same campaign; assert the output does not contradict the committed symbol.

**Canonical source:** `10-campaign-design.md` §11 Engine implications §7 (quantum-ogre guardrail); `architecture/generation/03-scenario-encounter-generation.md` §Canon retrieval.

---

## 18. Any investigation scenario must have at least 3 independent clue-paths to each load-bearing conclusion — validated at authoring time, not hoped for at runtime

**Why:** A single clue + a single failed roll = dead mystery. The Three Clue Rule (`10-campaign-design.md`, Alexandrian) is the structural fix. This must be enforced by the campaign loader (validation gate 6 in the authoring pipeline), not left to the author's discipline. A beat that requires a conclusion but has fewer than 3 clue-edges to it must block campaign load.

**How to detect:** In the campaign loader's beat-graph validation step (step 6), add: `for each beat with required_conclusion: assert clue_edges_to_beat >= 3 OR throw LoadError`. A test campaign with a single-clue mystery must fail to load with a descriptive error naming the under-clued beat.

**Canonical source:** `10-campaign-design.md` §11 Engine implications §8; `11-dm-styles-tones.md` §8.7; `architecture/generation/01-campaign-authoring-validation.md` §Validation gates.

---

## Quick reference index

| # | Rule (imperative, one line) | Severity |
|---|---|---|
| 1 | Lock embedding model + dimension before first vector write | Data integrity |
| 2 | Every generation prompt starts with canon retrieval | Campaign coherence |
| 3 | DM never calls `roll()` — only `check` / `attack` / `cast_spell` | Rules integrity |
| 4 | NPC reads are structurally redacted in the tool layer | Security / canon |
| 5 | One agent holds the floor; only the Router picks the next speaker | Concurrency / UX |
| 6 | All state writes go through the tool surface and are audited | Auditability |
| 7 | Markdown campaign files are never written during play | Source integrity |
| 8 | Seed RNG per session, log every roll before consuming it | Determinism |
| 9 | Director runs only between scenes, never mid-scene | State consistency |
| 10 | Combat agent owns narration from `start_combat` to `end_combat` | Narrative coherence |
| 11 | Tool args validated by Zod, not by prompt instructions | Robustness |
| 12 | Summarizer preserves rolls + entities + decisions; prunes small talk | Context integrity |
| 13 | DM never invents geography — all spatial facts come from graph queries | World coherence |
| 14 | Session-zero state read by every agent at every scene | Safety / content |
| 15 | Companion gate checks spotlight + budget, not just drives/lines | Player agency |
| 16 | Generated entities are permanent — never regenerate what exists | Canon integrity |
| 17 | Committed world-facts are append-only — no retcons from generation | Player trust |
| 18 | Investigation beats validated for ≥3 clue-paths at load time | Mystery integrity |
