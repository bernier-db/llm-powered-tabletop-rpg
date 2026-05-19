---
title: "v0.1 Milestone — DM + NPC + Skill Check"
status: DRAFT
summary: "TDD-first milestone spec: failing tests as the acceptance criteria for the v0.1 vertical slice. Done when every test in §3 is green, not when a checklist of files exists."
related: [02-tools-orchestration.md, 04-npc-memory.md, 13-risks-tripwires.md, 16-test-strategy.md, ../campaigns/test_smallest/]
updated: 2026-05-18
---

# v0.1 Milestone — DM + NPC + Skill Check

> **Working rule: TDD — red-green-refactor.** Write the tests first. Watch them fail. Make them pass. Refactor. The milestone is done when the tests in §3 are green — not when any particular set of files exists. Read `13-risks-tripwires.md` before writing any engine code.

---

## 1. The slice in one paragraph

v0.1 runs a single interactive session against the `campaigns/test_smallest/` campaign. The engine loads the authored markdown files, seeds a runtime SQLite database, opens beat `01_arrival` at the Drunken Goose, and enters a turn loop: the player types text, the DM agent reads scene context through the tool surface, optionally defers substantial NPC dialogue to the `barkeep_marta` agent via the router's `defer_to` mechanism, calls `check()` (never `roll()` directly) when a skill check is warranted, receives a four-degree outcome from the rules engine, narrates the result, and commits state changes through the tool surface. After at least one full turn the engine shuts down cleanly, flushing all runtime state to disk so that a fresh engine instance can reload the same session. v0.1 does **not** include: the Combat agent or any combat resolution (`attack`, `start_combat`, `end_combat`); the Director agent or any between-scene hand-offs; the Generator agent or any on-demand world/NPC creation; multimodal output (TTS/STT/image); Companion autonomy gates; multiplayer; or any NPC actor other than Marta — `barkeep_marta` is implemented directly, not through a generic NPC actor factory.

---

## 2. Public-interface contract for v0.1

The v0.1 tests import **only** from `src/engine/index.ts` and `src/schema/`. Internal classes, helper modules, and file structure are not part of the contract and may change freely during refactoring.

```ts
// src/engine/index.ts

export interface Engine {
  /** Load a campaign from authored markdown and seed runtime state into a fresh DB at dbPath. */
  loadCampaign(campaignPath: string, dbPath: string): Promise<void>;

  /**
   * Open a beat by id, initialising a new scene in the runtime DB.
   * Idempotent when resuming: calling with the same beatId on a DB-loaded session
   * returns the existing scene without creating a new one.
   */
  openScene(beatId: string): Promise<SceneSnapshot>;

  /**
   * Submit player text and receive the engine's full response.
   * Runs the complete turn loop: context read → optional NPC defer → optional check →
   * narration → state commit.
   */
  input(text: string): Promise<TurnResult>;

  /**
   * Return an immutable snapshot of engine state at this moment.
   * Tests assert against this; calling it does not advance state.
   */
  snapshot(): EngineSnapshot;

  /** Flush runtime state to disk and release all resources. */
  shutdown(): Promise<void>;
}

// ── SceneSnapshot ─────────────────────────────────────────────────────────────

export interface SceneSnapshot {
  scene_id: string;              // UUID; stable for the lifetime of the open scene
  beat_id: string;               // e.g. '01_arrival'
  location_id: string;           // e.g. 'drunken_goose'
  actors_present: ActorRef[];    // every Actor whose id appears in the beat
  turn_log: TurnEntry[];         // empty on open; grows with each input() call
  opened_at: string;             // ISO timestamp
}

export interface ActorRef {
  id: string;
  name: string;
  controller: 'human' | 'agent' | 'dm';
}

export interface TurnEntry {
  turn_index: number;
  player_input: string;
  narration: string;
  ts: string;                    // ISO timestamp
}

// ── TurnResult ────────────────────────────────────────────────────────────────

export interface TurnResult {
  turn_index: number;
  narration: string;             // non-empty; DM's fully buffered response
  state_log_entries: StateLogEntry[];  // all tool calls made during this turn
  roll_log_entries: RollLogEntry[];    // all dice rolls this turn (may be empty)
  npc_turn?: NPCTurnPayload;     // present iff the router deferred to an NPC
  check_result?: CheckOutcome;   // present iff check() was called this turn
}

export interface NPCTurnPayload {
  npc_id: string;
  dialogue: string;
  intent: 'reveal' | 'withhold' | 'demand' | 'offer' | 'deflect';
}

export type CheckDegree = 'crit_fail' | 'fail' | 'success' | 'crit_success';

export interface CheckOutcome {
  actor_id: string;
  skill: string;
  dc: number;
  total: number;                 // raw d20 + modifier
  degree: CheckDegree;
}

// ── Log row types (shared with src/schema/) ───────────────────────────────────

export interface StateLogEntry {
  seq: number;
  session_id: string;
  agent_id: string;              // e.g. 'dm-<scene_id>', 'npc-barkeep_marta'
  tool_name: string;
  args: Record<string, unknown>;
  result_summary: string;        // what the tool returned; redacted fields absent
  ts: string;
}

export interface RollLogEntry {
  id: string;
  session_id: string;
  seed_offset: number;
  actor_id: string;
  tool_name: string;             // always 'check' for v0.1; never 'roll'
  context: string;
  roll: number;                  // raw d20 (1–20)
  mods: number;
  total: number;
  degree: CheckDegree;
  ts: string;
}

// ── EngineSnapshot ────────────────────────────────────────────────────────────

export interface EngineSnapshot {
  session_id: string;
  campaign_id: string;
  scene: SceneSnapshot;
  roll_log: RollLogEntry[];
  state_log: StateLogEntry[];
  npc_memories: {
    [npc_id: string]: NPCMemoryRow[];
  };
}

export interface NPCMemoryRow {
  id: string;
  npc_id: string;
  event_summary: string;
  valence: number;               // -3..+3
  salience: number;              // 1..10
  recall_strength: number;
  related_actor_ids: string[];
  pinned: boolean;
  ts: string;
}
```

**Rule:** Tests must not import from any path except `src/engine/index.ts` and `src/schema/`. Internal module boundaries are not part of the contract.

---

## 3. Acceptance tests — failing first

Write each test before writing the implementation. Run the suite after each addition — confirm it fails. Implement until green. Refactor. Do not advance to the next phase until the current phase is fully green.

All integration tests live under `tests/integration/` or `tests/scenario/`. Tests use a deterministic RNG seed (`RNG_SEED=42` via env or Engine constructor option) and a temporary SQLite file per test (generate with `tmp` package; clean up in `afterEach`). The test runner is Vitest.

A helper `mutateCampaignFixture(campaignPath, targetFile, patcher)` copies the campaign tree to a temp directory, applies `patcher` (a function that mutates the parsed YAML object), writes it back, and returns the temp path. The original campaign source is never touched by any test.

---

### Phase A — Loader

> **Goal:** Prove the loader reads authored markdown faithfully, validates it, seeds the runtime DB correctly, and never touches the source files.

**A-1**
- `describe('Loader'), it('parses test_smallest without throwing')`
- **Asserts:** `engine.loadCampaign(campaignPath, dbPath)` resolves without error for a valid `campaigns/test_smallest/` path.
- **File:** `tests/integration/loader.test.ts`
- **Tripwire:** N/A (baseline sanity)

**A-2**
- `describe('Loader'), it('rejects a campaign with a broken NPC reference')`
- **Asserts:** `loadCampaign` rejects (throws a `LoadError`) when `01_arrival.yaml` is mutated via `mutateCampaignFixture` to reference an NPC id that does not exist in `npcs/`. Zero rows must be written to the DB before the error propagates (transactional seed).
- **File:** `tests/integration/loader.test.ts`
- **Tripwire:** Tripwire #7 (mutation happens in a temp copy — the original `campaigns/` is never touched) and Tripwire #11 (Zod schema validation catches the broken reference before any DB write).

**A-3**
- `describe('Loader'), it('produces a DB whose rows round-trip through Zod schemas')`
- **Asserts:** After `loadCampaign`, every row in the `actors`, `locations`, `beats`, and `npc_memories` tables parses through its corresponding schema in `src/schema/` without throwing.
- **File:** `tests/integration/loader.test.ts`
- **Tripwire:** Tripwire #11 (if rows don't parse, the tool layer would corrupt on first write).

**A-4**
- `describe('Loader'), it('writes embedding rows for every codex-bound entity')`
- **Asserts:** After `loadCampaign`, the sqlite-vec table contains at least one embedding row per NPC defined in the campaign. Count check only — vector content is not asserted.
- **File:** `tests/integration/loader.test.ts`
- **Tripwire:** Tripwire #1 (embedding model and vector dimension must be locked at DB initialisation; the loader is where that lock fires).

**A-5**
- `describe('Loader'), it('never modifies any file under campaigns/')`
- **Asserts:** After `loadCampaign(realCampaignPath, dbPath)`, the `mtime` of every file under `campaigns/test_smallest/` is identical to the `mtime` recorded before the call.
- **File:** `tests/integration/loader.test.ts`
- **Tripwire:** Tripwire #7 (markdown campaign files are read-only after seeding; the loader is the only read pass).
- **Pseudocode:**
  ```ts
  const before = recordMtimes('campaigns/test_smallest');
  await engine.loadCampaign('campaigns/test_smallest', tmpDb);
  const after = recordMtimes('campaigns/test_smallest');
  expect(after).toEqual(before);
  ```

---

### Phase B — Engine open + first turn

> **Goal:** Prove the engine opens a scene correctly, responds to the first player input, records state faithfully, and produces deterministic rolls.

**B-1**
- `describe('Engine'), it("openScene('01_arrival') returns snapshot with correct location, actors_present, and a fresh scene_id")`
- **Asserts:** Returned `SceneSnapshot` has `beat_id === '01_arrival'`, `location_id === 'drunken_goose'`, `actors_present` contains refs for both `pc_aryn` and `barkeep_marta`, and `scene_id` is a non-empty string not seen before.
- **File:** `tests/integration/engine-open.test.ts`
- **Tripwire:** N/A

**B-2**
- `describe('Engine — first turn'), it("input('look around') returns a TurnResult with non-empty narration")`
- **Asserts:** `result.narration.length > 0`. Content is not asserted (LLM concern).
- **File:** `tests/integration/engine-open.test.ts`
- **Tripwire:** N/A

**B-3**
- `describe('Engine — first turn'), it('snapshot() shows the turn appended to scene.turn_log after input()')`
- **Asserts:** After one `input(...)` call, `engine.snapshot().scene.turn_log` has length 1 and `turn_log[0].player_input` equals the string passed to `input()`.
- **File:** `tests/integration/engine-open.test.ts`
- **Tripwire:** Tripwire #6 (state writes are audited; the turn log is a required audit artifact).

**B-4**
- `describe('Engine — determinism'), it('the same input with the same RNG seed produces identical roll_log entries')`
- **Asserts:** Two fresh engine instances with the same `RNG_SEED`, loaded from the same campaign, given the same sequence of `input()` calls, produce `roll_log_entries` that are deep-equal (same `roll`, `seed_offset`, `total`). Narration text is not compared.
- **File:** `tests/integration/determinism.test.ts`
- **Tripwire:** Tripwire #8 (seeded, logged RNG is a first-class invariant; determinism is testable).
- **Pseudocode:**
  ```ts
  const [r1, r2] = await Promise.all([
    buildEngine(42).then(e => e.input('I examine the room')),
    buildEngine(42).then(e => e.input('I examine the room')),
  ]);
  expect(r1.roll_log_entries).toEqual(r2.roll_log_entries);
  ```

---

### Phase C — NPC handoff

> **Goal:** Prove the router defers correctly to `barkeep_marta`, the NPC returns dialogue + intent, the DM resumes, the NPC cannot read redacted fields, and the memory write is auditable.

**C-1**
- `describe('NPC handoff'), it("input('I greet the barkeep') causes the router to defer to barkeep_marta (state_log evidence)")`
- **Asserts:** `result.state_log_entries` contains at least one entry with `tool_name === 'defer_to'` and `args.npc_id === 'barkeep_marta'`, where `agent_id` begins with `'dm-'`.
- **File:** `tests/integration/npc-handoff.test.ts`
- **Tripwire:** Tripwire #5 (only the Router picks the next speaker; `defer_to` is the only legitimate handoff signal).

**C-2**
- `describe('NPC handoff'), it('the NPC turn result includes both dialogue and a valid intent')`
- **Asserts:** `result.npc_turn` is defined, `result.npc_turn.dialogue.length > 0`, and `result.npc_turn.intent` is one of the declared union members.
- **File:** `tests/integration/npc-handoff.test.ts`
- **Tripwire:** N/A

**C-3**
- `describe('NPC handoff'), it('the DM resumes after the NPC speaks (state_log shows floor returned to dm)')`
- **Asserts:** In `result.state_log_entries`, at least one entry has an `agent_id` beginning with `'npc-'` (NPC's turn), and the final narration-producing entry has an `agent_id` beginning with `'dm-'` (DM resumed).
- **File:** `tests/integration/npc-handoff.test.ts`
- **Tripwire:** Tripwire #5 (one agent holds the floor at a time; DM must resume after NPC yields).

**C-4**
- `describe('NPC handoff'), it('the NPC agent never read a redacted actor field (state_log read trace)')`
- **Asserts:** Every `state_log_entries` entry where `agent_id` begins with `'npc-'` and `tool_name === 'get_actor'` has a `result_summary` that does not contain the strings `'secrets'`, `'inventory'`, or `'hidden_agenda'`.
- **File:** `tests/integration/npc-handoff.test.ts`
- **Tripwire:** Tripwire #4 (NPC reads are structurally redacted in the tool layer — not by prompt instruction). This is the highest-priority safety invariant in the v0.1 surface.

**C-5**
- `describe('NPC handoff'), it('a new npc_memory row exists for barkeep_marta referencing pc_aryn after the encounter')`
- **Asserts:** After an NPC handoff turn, `engine.snapshot().npc_memories['barkeep_marta']` contains at least one entry whose `related_actor_ids` includes `'pc_aryn'`, and that entry was not present in the pre-turn snapshot (count delta ≥ 1).
- **File:** `tests/integration/npc-handoff.test.ts`
- **Tripwire:** Tripwire #6 (`commit_npc_memory` is a state write that must go through the tool surface and produce an auditable row).

---

### Phase D — Skill check

> **Goal:** Prove the rules engine integration is correct: DM calls `check()` (never `roll()` directly), a four-degree outcome is present in TurnResult, and roll_log is populated with all required fields.

**D-1**
- `describe('Skill check'), it("a perception-check input causes the DM to call check() (state_log entry present)")`
- **Asserts:** After `engine.input("I try to read the barkeep's mood — perception check")`, `result.state_log_entries` contains at least one entry with `tool_name === 'check'` and `agent_id` beginning with `'dm-'`.
- **File:** `tests/integration/skill-check.test.ts`
- **Tripwire:** Tripwire #3 (DM must call `check`, not `roll`).

**D-2**
- `describe('Skill check'), it('the DM agent never called roll() directly')`
- **Asserts:** `result.state_log_entries` contains zero entries where `tool_name === 'roll'` and `agent_id` matches `/^dm-/`.
- **File:** `tests/integration/skill-check.test.ts`
- **Tripwire:** Tripwire #3 (structural fix: `roll` is absent from the DM's tool surface; this test enforces that absence via the state_log).

**D-3**
- `describe('Skill check'), it('the TurnResult contains a four-degree outcome')`
- **Asserts:** `result.check_result` is defined, and `result.check_result.degree` is one of `'crit_fail' | 'fail' | 'success' | 'crit_success'`.
- **File:** `tests/integration/skill-check.test.ts`
- **Tripwire:** N/A (structural correctness of rules engine output).

**D-4**
- `describe('Skill check'), it('the roll_log entry has session_id and seed_offset')`
- **Asserts:** `result.roll_log_entries` contains at least one entry with a non-empty `session_id` and a numeric `seed_offset`.
- **File:** `tests/integration/skill-check.test.ts`
- **Tripwire:** Tripwire #8 (every roll must be logged with `session_id` and `seed_offset` before the result is consumed).

---

### Phase E — Shutdown + reload

> **Goal:** Prove persistence: the DB survives a shutdown, a fresh engine can resume from it, and the authored markdown vs. runtime DB split is correctly preserved.

**E-1**
- `describe('Persistence'), it('shutdown() flushes the DB — roll_log is non-empty after one playthrough')`
- **Asserts:** After at least one `input()` call followed by `engine.shutdown()`, a direct SQLite read of `dbPath` finds `roll_log` is non-empty (≥1 row).
- **File:** `tests/integration/persistence.test.ts`
- **Tripwire:** Tripwire #8 (roll_log is the determinism audit trail; it must survive shutdown).

**E-2**
- `describe('Persistence'), it('a fresh engine can load a saved DB and resume at the same scene')`
- **Asserts:** Engine A runs a turn, saves via `shutdown()`. Engine B calls `loadCampaign(dbPath)` (the DB file, not the markdown root) and `openScene('01_arrival')`. The returned `scene_id` equals the `scene_id` from Engine A's snapshot.
- **File:** `tests/integration/persistence.test.ts`
- **Tripwire:** Tripwire #7 (saving and reloading works through the runtime DB only; markdown is not re-read on resume).
- **Pseudocode:**
  ```ts
  const snap1 = engine1.snapshot();
  await engine1.shutdown();
  const engine2 = createEngine({ seed: RNG_SEED });
  await engine2.loadCampaign(dbPath); // saved DB, not markdown
  const scene2 = await engine2.openScene('01_arrival');
  expect(scene2.scene_id).toBe(snap1.scene.scene_id);
  ```

**E-3**
- `describe('Persistence'), it('markdown-seeded and DB-resumed sessions have the same scene_id; two fresh markdown loads have different scene_ids')`
- **Asserts:** Engine A (markdown seed) opens `01_arrival` → `scene_id_A`. Engine B (loads A's saved DB) opens `01_arrival` → `scene_id_B === scene_id_A`. Engine C (fresh markdown seed, no prior DB) opens `01_arrival` → `scene_id_C !== scene_id_A`.
- **File:** `tests/integration/persistence.test.ts`
- **Tripwire:** Tripwire #7 (proves the authored vs. runtime split: markdown seeding always creates new runtime state; DB loading resumes existing state).

---

## 4. CLI smoke test (manual acceptance)

Run after `npm run dev`. This is a human-in-the-loop walkthrough, not a green/red gate. It passes when the described behavior is observed.

1. **Launch** — `npm run dev -- --campaign campaigns/test_smallest`. The CLI prints a campaign title line then a cold-open description. The description mentions the tavern and time of day.

2. **Look around** — Type `look around`. The engine narrates the common room: low ceiling, the bar, Marta working, the quiet atmosphere. Marta's name or role appears.

3. **Greet Marta** — Type `I walk up to the bar and greet the barkeep`. Marta responds with dialogue in her voice register (short sentences, "aye," guarded). The DM frames her response. Output is not placeholder text.

4. **Ask about missing people** — Type `I ask Marta if she's heard about anyone going missing`. Marta confirms the farmhands are gone (minimal words, does not volunteer the cultist detail or Torvald).

5. **Perception check** — Type `I try to read Marta's mood — perception check`. The engine resolves a Perception check for Aryn (modifier +5 vs. a DC). The CLI prints the roll total, the degree label (`Success`, `Critical Success`, etc.), and the DM narrates what Aryn observes about Marta.

6. **Quit** — Type `quit`. The engine prints "Session saved." The SQLite DB file at the configured save path exists and is non-zero bytes. No `.db-journal` file alongside it.

7. **Reload** — Restart with `npm run dev -- --load <dbPath>`. The CLI resumes the same session without a new cold-open. The engine enters the turn prompt immediately.

---

## 5. What's IN scope vs. OUT of scope

### IN scope for v0.1

- **Campaign loader** — reads `campaigns/test_smallest/`, validates all entity references, seeds the runtime SQLite DB in a single transaction
- **DM agent** — reads scene context, narrates, calls `check()`, defers to Marta via `defer_to`, calls `commit_npc_memory` after memorable beats
- **NPC agent — barkeep_marta only** — reads redacted view, returns dialogue + intent; not a generic NPC actor factory
- **Router** — grants and revokes the floor; the only component that calls `defer_to`
- **Rules engine — `check()` only** — d20 + modifiers vs. DC, four-degree outcome, writes to `roll_log` before returning
- **State store** — SQLite runtime DB with `actors`, `locations`, `beats`, `scenes`, `turn_log`, `state_log`, `roll_log`, `npc_memories` tables
- **Tool surface — minimum subset** — `get_actor` (with structural redaction), `get_scene`, `get_actors_in_scene`, `get_npc_memories`, `check`, `commit_npc_memory`, `defer_to` (router signal)
- **NPC memory write** — `commit_npc_memory` called by DM after Marta interaction; produces a new `npc_memories` row
- **Public Engine API** — the five-method interface defined in §2, exported from `src/engine/index.ts`
- **Minimal CLI** — `npm run dev -- --campaign`, turn loop, `quit` saves and exits, `--load <dbPath>` resumes

### OUT of scope for v0.1

- Combat agent, `attack`, `start_combat`, `end_combat`, initiative tracking
- Director agent, scene breaks, between-scene runs, scene briefs, faction clock advancement
- Generator agent and all generation tools
- Any NPC actor other than `barkeep_marta` (Vellis, antagonist_a, etc.)
- Companion agent and autonomy gates
- Multiplayer (multiple actors with `controller: 'human'`)
- Multimodal output (TTS, STT, image generation)
- Summarizer (hot → warm compression)
- Geography tools (`get_neighbors`, `get_path`, `describe_surroundings`, `move_party`)
- Play-time `query_codex` / cold recall via sqlite-vec (embeddings written at load time per A-4; play-time retrieval deferred)
- Session zero configuration UI — session zero values are read directly from `campaign.yaml` for v0.1

---

## 6. Definition of done

**The milestone is done when all of the following are true simultaneously:**

1. Every test in §3 (Phases A through E, 17 tests total) is green under `npm run test`.
2. `npm run check` passes — TypeScript type-check (`tsc --noEmit`), linter (`eslint`), and the full test suite complete without error.
3. The CLI smoke test in §4 passes by hand — a human runs every step and sees the described output.
4. The `roll_log` table in the runtime SQLite DB is non-empty after one complete playthrough (verified by test E-1 and visually during the §4 smoke test).
5. No file under `campaigns/test_smallest/` has been modified during a playthrough — verified by test A-5 (mtime check) and by inspection confirming the DB save path is outside `campaigns/`.
6. No tripwire from `spec/13-risks-tripwires.md` that is enforceable by the v0.1 test surface has been violated. See the tripwire coverage map below.

### Tripwire coverage map for v0.1

| # | Rule (abbreviated) | v0.1 status | Enforcing test(s) |
|---|---|---|---|
| 1 | Lock embedding model before first vector write | Covered | A-4 |
| 2 | Generation prompts start with canon retrieval | N/A — Generator out of scope | — |
| 3 | DM never calls `roll()` directly | Covered | D-1, D-2 |
| 4 | NPC reads are structurally redacted | Covered | C-4 |
| 5 | One agent holds the floor; only Router picks next | Covered | C-1, C-3 |
| 6 | All state writes go through tool surface and are audited | Covered | B-3, C-5, E-1 |
| 7 | Markdown campaign files never written during play | Covered | A-2 (mutation in temp copy), A-5 (mtime check) |
| 8 | Seed RNG, log every roll before consuming | Covered | B-4, D-4, E-1 |
| 9 | Director runs only between scenes | N/A — Director out of scope | — |
| 10 | Combat agent owns narration during combat | N/A — Combat out of scope | — |
| 11 | Tool args validated by Zod, not by prompt | Covered | A-2 (loader validation), A-3 (round-trip parse) |
| 12 | Summarizer preserves rolls + entities; prunes small talk | N/A — Summarizer out of scope | — |
| 13 | DM never invents geography | N/A — Geography tools out of scope | — |
| 14 | Session-zero state read by every agent at every scene | Partial — read from `campaign.yaml` at load; full per-scene prompt injection enforcement deferred | — |
| 15 | Companion gate checks spotlight + budget | N/A — Companion out of scope | — |
| 16 | Generated entities are permanent; never regenerate | N/A — Generator out of scope | — |
| 17 | Committed world-facts are append-only | N/A — World-facts ledger out of scope | — |
| 18 | Investigation beats validated for ≥3 clue-paths | N/A — `test_smallest` has open termini; three-clue validation deferred | — |

---

## 7. Anti-scope creep

The following are things an implementing agent is likely to be tempted to build. **Do not build them for v0.1.** If a feature is not required by a test in §3, it is out of scope.

- **A generic NPC actor factory.** Only `barkeep_marta` is needed. Implement Marta's agent directly; let a reusable factory emerge in v0.2 when a second NPC is required by a test.
- **An abstract LLM client interface.** No test asserts on model-swappability. Do not build an `LLMClient` adapter layer beyond what `@anthropic-ai/sdk` requires directly.
- **Performance optimisation.** No batching, caching, or connection pooling. Premature optimisation before the first passing test is waste.
- **Narration polish.** Tests only assert `narration.length > 0` and structural field presence. Prompt quality, tone calibration, and voice exemplar fidelity are v0.2 work.
- **Additional tool implementations.** Only the minimum subset listed in §5 is needed. Do not implement `get_inventory`, play-time `query_codex`, `get_relationships`, `advance_time`, `mark_quest_beat`, or any geography tool — none appear in any §3 test.
- **The Summarizer.** Not tested. The v0.1 session is short enough that context window is not a constraint.
- **The Director.** There is no `scene_break` in the v0.1 test flow. Even director stubs create dead call paths that accumulate maintenance debt.
- **Session-zero configuration UI.** Read session-zero values from `campaign.yaml` as a static config block. A configuration step or wizard is not tested in §3.
- **Streaming narration.** `TurnResult.narration` is a fully-buffered string. Do not implement streaming until the API contract is stable and the tests are green.
