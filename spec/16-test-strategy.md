---
title: Test Strategy
status: DRAFT
summary: Canonical test policy for the engine — inverted pyramid (integration > scenario > unit > eval), MockLLMClient, RNG pinning, observable-surface-only assertions, and CI gates.
related: [13-risks-tripwires.md, 15-v01-milestone.md, 02-tools-orchestration.md, 08-cross-cutting.md, ../src/schema/index.ts]
updated: 2026-05-18
---

# Test Strategy

This is the canonical test policy for the engine. The engineering `CLAUDE.md` cites this file. When this document and any other source conflict, this document wins.

---

## 1. Working rule — red-green-refactor

Every production-code change starts with a failing test that pins the observable behavior the change is meant to produce. The test must fail for the right reason before any implementation code is written — a test that fails with `TypeError: Cannot read properties of undefined` is not ready; a test that fails with `Expected: 1, Received: 0` on a `roll_log` row count is. Once the test is green, refactor freely. Tests are the safety net that makes refactoring safe; skipping the refactor step is how code accretes complexity.

**Off-protocol allowances.** TDD can be skipped for: spike work explicitly marked `// SPIKE: throwaway` in the file header; scaffolding commits that contain no behavioral logic (config files, empty module stubs, type-only files); pure configuration (`.eslintrc`, `tsconfig.json`, `vitest.config.ts`). If in doubt: write the test first. The cost is low; the benefit is that you know what "done" means before you start.

---

## 2. What we test — observable surfaces only

Tests are only permitted to import from these five public surfaces:

| Surface | What it exposes |
|---|---|
| `src/engine/` | The Engine public API — `Engine.boot()`, `EngineSession`, `session.playerInput()`, `session.openScene()`, `session.close()` (signatures in `spec/15-v01-milestone.md` §2) |
| `src/schema/` | Zod schemas, TypeScript types, factory helpers |
| `src/tools/` | Tool functions callable directly in tests — `get_actor`, `check`, `commit_npc_memory`, etc. (each with a contract tested at the function boundary) |
| `src/loader/` | The `load()` function and its observable artifacts: rows in SQLite, codex entries, Zod validation errors |
| `src/cli/` | The CLI's IO behavior — input line → output stream — via process spawn or an in-memory IO adapter |

**Tests must not import from any other path.** Not from `src/engine/internal/*`, not from `src/agents/*` internals, not from prompt-builder modules, not from helper utilities that are not themselves a public surface. The rule: if the behavior being tested is not part of a published contract, the test is testing the wrong thing.

The enforcement heuristic: if a test breaks because you renamed a private function or changed an internal variable layout, the test was wrong. If a test breaks because observable state changed, that is a real signal.

### Wrong test vs. right test — side by side

**Wrong:**
```ts
// tests/unit/npc-prompt.test.ts
import { buildNpcPromptContext } from '../../src/agents/npc/prompt-builder';

it('builds a non-empty context string', () => {
  const ctx = buildNpcPromptContext(mockNpc, mockScene);
  expect(ctx.length).toBeGreaterThan(100);
});
```
This imports an internal module. It tests prompt text length, which is not a behavioral contract. It breaks on every prompt refactor — all of which are valid changes.

**Right:**
```ts
// tests/integration/npc-redaction.test.ts
import { Engine } from '../../src/engine';

it('after playerInput asking about Marta, state_log shows a redacted-view call from the NPC agent', async () => {
  const session = await Engine.boot({ campaignPath: 'campaigns/test_smallest', rngSeed: 0xC0DE0001, dbPath: ':memory:' });
  await session.openScene('01_arrival');
  await session.playerInput('I ask the barkeep about the missing villagers.');

  const memRead = session.db.prepare(
    "SELECT * FROM state_log WHERE tool_name IN ('get_npc_memories','query_memories') AND agent_id LIKE '%barkeep_marta%' LIMIT 1"
  ).get();

  expect(memRead).not.toBeNull();

  // And confirm no raw get_actor call from any *other* NPC agent:
  const crossRead = session.db.prepare(
    "SELECT * FROM state_log WHERE tool_name = 'get_actor' AND agent_id NOT LIKE '%dm%' AND agent_id NOT LIKE '%barkeep_marta%'"
  ).all();
  expect(crossRead).toHaveLength(0);

  await session.close();
});
```
This imports only `src/engine/`. It asserts against the `state_log` — an observable, auditable artifact. It survives any prompt refactor.

---

## 3. The test pyramid — intentionally inverted

Most projects target unit > integration > E2E. **This project targets integration > scenario > unit > eval.**

The reason is structural. The engine's value is in component composition: the Router grants the floor to the right agent; the tool surface enforces redaction; the rules engine writes to `roll_log` before returning; the DM agent cannot call `roll()`. None of those invariants live inside a single pure function — they live at the seams between components. Unit tests do not exercise seams. Bugs in this engine will hide at seams, not in isolated helpers. The pyramid must be inverted to find them.

Pure-function unit tests are still useful and required for schemas and the rules engine. They should not dominate.

### Tier definitions and target balance

**Unit tests (≈20%)**

Scope: Zod schemas, type factories, pure deterministic helpers in the rules engine (`degreeFromMargin(d20, dc)`, `applyModifiers(base, mods)`), and any pure utility with no I/O.

Location: co-located with source — `src/foo.ts` + `src/foo.test.ts`.

Speed gate: <10ms per test. If a unit test is slow, it is not a unit test.

Example: parsing a valid `NPCMemory` YAML fixture against the Zod schema; asserting `degreeFromMargin(20, 15)` returns `'crit_success'`.

**Integration tests (≈55%)**

Scope: engine + real SQLite (in-memory) + real schemas + mock LLM (see §4). These are the primary test tier. They exercise the seams.

Location: `tests/integration/<subject>.test.ts`.

Examples:
- "loader seeds SQLite from `test_smallest/` campaign; schema round-trip validates every seeded row"
- "tool surface returns a redacted view of `pc_aryn` when called with `caller_agent_type: 'npc'` — no `secrets`, `inventory`, or `hidden_agenda`" (tripwire #4)
- "rules engine writes a `roll_log` row before `check()` returns — confirmed by asserting row exists even if caller throws after the return" (tripwire #8)
- "DM agent's registered tool list does not include `roll`" (tripwire #3, also verified by static grep in CI)
- "Zod schema rejects `check({ skill: 'nonexistent', dc: 'banana' })` before any DB write" (tripwire #11)
- "campaign loader rejects a beat referencing a non-existent NPC id; exits non-zero; leaves no partial DB write" (tripwire #18 analogue at load time)
- "generation tool calls `canonSnapshot` before invoking LLM; mock codex query throws → generation call propagates error" (tripwire #2)

Use the real SQLite, the real Zod schemas, the real tool surface. Mock only the LLM client.

**Scenario tests (≈20%)**

Scope: end-to-end campaign playthroughs against `campaigns/test_smallest/`. These are the v0.1 milestone tests from `spec/15-v01-milestone.md` §3. Each scenario test boots the engine, plays through a scripted beat sequence using the mock LLM in replay mode, and asserts observable state at each phase.

Location: `tests/scenario/<flow>.test.ts`.

Examples:
- `tests/scenario/v01-arrival.test.ts` — the full `01_arrival` beat sequence; asserts `state_log`, `roll_log`, `npc_memories` shape at each step
- `tests/scenario/loader-rejects-malformed.test.ts` — feeds a bad campaign; asserts non-zero exit and clean DB state

Scenario tests are slower than integration tests (they run the full engine loop) but still use the mock LLM, so they do not depend on the Anthropic API.

**Eval tests (≈5%)**

Scope: qualitative behavioral checks — "is the DM still doing DM things?" These check agent behavior patterns that cannot be verified by state inspection alone. See §6 for the full format.

Location: `tests/eval/*.eval.ts`.

Run separately: `npm run eval`. Not on every commit. Not blocking PRs by default. See §6.

---

## 4. Mock LLM client + recorded fixtures

This is the single most important piece of test infrastructure. Without it, every integration and scenario test requires a live API key, is slow, is non-deterministic, and costs money. With it, the full test suite runs offline, deterministically, and in milliseconds.

### `MockLLMClient`

Implement in `tests/helpers/mock-llm.ts`. The class must implement the same interface as the project's `LLMClient` wrapper around `@anthropic-ai/sdk` — not the SDK directly, but the project's own abstraction. This keeps the mock at the right boundary.

```ts
// tests/helpers/mock-llm.ts
export class MockLLMClient implements LLMClient {
  constructor(private mode: 'replay' | 'record' = 'replay') {}

  async createMessage(params: MessageParams): Promise<Message> {
    const hash = hashPrompt(params);
    if (this.mode === 'replay') {
      const fixture = loadFixture(hash);       // throws if missing
      return fixture.response;
    }
    // record mode: call real API, write fixture, return response
    const response = await realClient.createMessage(params);
    writeFixture(hash, params, response);
    return response;
  }
}
```

**Default mode: replay.** CI always runs in replay mode. If a fixture is missing, the test throws immediately with a clear message: `Missing LLM fixture for hash <hash>. Run with RECORD_LLM_FIXTURES=1 to record.`

**Record mode:** triggered by `RECORD_LLM_FIXTURES=1` in the environment. Calls the real Anthropic API, writes the fixture file, and returns the response normally. Run once locally; commit the fixture. Do not run in CI.

### Fixture file shape

Location: `tests/fixtures/llm/<hash>.json`

```json
{
  "prompt_hash": "a3f7c2d1",
  "prompt_preview": "You are a DM agent. The scene is: The Drunken Goose. Player says: I ask the barkeep about the...",
  "response": { "content": [...], "stop_reason": "end_turn", "usage": { ... } },
  "recorded_at": "2026-05-18T14:32:00Z",
  "model": "claude-opus-4-5"
}
```

The `prompt_preview` field is the first 200 characters of the prompt. It exists for human review during PRs. A fixture file is the test's source of truth: a bad fixture means a test that passes on wrong behavior. **PRs that add or modify fixture files require a manual eyeball pass** — does the response actually reflect the design? Does the DM agent call `check` and not `roll`? Does the NPC response fit the `speech_sample` register?

### Sample integration test using a fixture

```ts
// tests/integration/skill-check-log.test.ts
import { Engine } from '../../src/engine';
import { MockLLMClient } from '../helpers/mock-llm';

it('check() writes roll_log row before returning, with all required fields', async () => {
  const session = await Engine.boot({
    campaignPath: 'campaigns/test_smallest',
    rngSeed: 0xC0DE0001,
    dbPath: ':memory:',
    llmClient: new MockLLMClient('replay'),
  });
  await session.openScene('01_arrival');
  const rollsBefore = session.db.prepare('SELECT COUNT(*) as n FROM roll_log').get().n;

  await session.playerInput('I listen carefully to sense if she is hiding something.');

  const rollsAfter = session.db.prepare('SELECT COUNT(*) as n FROM roll_log').get().n;
  expect(rollsAfter).toBe(rollsBefore + 1);

  const roll = session.db.prepare('SELECT * FROM roll_log ORDER BY ts DESC LIMIT 1').get();
  expect(roll.tool_name).toBe('check');
  expect(roll.session_id).toBeTruthy();
  expect(roll.seed_offset).toBeGreaterThanOrEqual(0);
  expect(['crit_failure', 'failure', 'success', 'crit_success']).toContain(roll.degree);

  await session.close();
});
```

---

## 5. Determinism

**Hard rule: every test that involves the rules engine must pin the RNG seed.**

Tests run with `rngSeed: 0xC0DE0001` (the project constant) unless the test is specifically exercising seed-driven variance (e.g., "different seeds produce different roll sequences"). Pinning the seed means the `roll_log` becomes a full assertion surface: every roll's `raw_d20`, `seed_offset`, and `degree` are known in advance for a given input sequence.

This is not optional for replay mode. The `MockLLMClient` replays fixtures keyed to prompt hashes; if the rules engine produces non-deterministic outputs that change the DM's prompt (e.g., the narration of a crit success vs. a failure), the hash will not match and the fixture will be missing. Pin the seed; pin the hash; get deterministic CI.

Cross-reference: tripwire #8 in `spec/13-risks-tripwires.md` — "Seed RNG per session, log every roll before consuming it." The test for tripwire #8 is an integration test: call `check()`, kill the process mid-run (or throw after return), replay from `roll_log`, confirm the roll was already recorded.

`grep -rn "Math\.random\|crypto\.randomInt" src/` returning zero hits is a CI assertion (AC-10 in `spec/15-v01-milestone.md`). This grep runs as a test, not as a code review note.

---

## 6. Eval harness — concrete format

The eval harness sketched as "open" in `spec/08-cross-cutting.md` is defined here.

### Scenario file format

TypeScript, for type safety against the engine's schema types.

```ts
// tests/eval/dm-asks-for-check.eval.ts
import type { EvalScenario } from '../helpers/eval-runner';

export default {
  name: 'DM asks for a check, never invents the outcome',
  setup: { campaign: 'campaigns/test_smallest', start_beat: '01_arrival', rngSeed: 0xC0DE0001 },
  steps: [
    {
      input: "I try to read the barkeep's mood.",
      expect: {
        tool_calls_include: ['check'],       // check() must appear in state_log
        tool_calls_exclude: ['roll'],        // roll() must NOT appear for the DM agent
        state_log_sequence: ['check', 'narrate'],  // narrate must follow check
      },
    },
  ],
  defends_tripwire: 3,  // tripwire #3: DM never calls roll() directly
} satisfies EvalScenario;
```

```ts
// tests/eval/npc-remembers-prior-interaction.eval.ts
export default {
  name: 'NPC memory persists and shapes disposition on re-encounter',
  setup: { campaign: 'campaigns/test_smallest', start_beat: '01_arrival', rngSeed: 0xC0DE0001 },
  steps: [
    { input: "I tip the barkeep generously.", expect: { tool_calls_include: ['commit_npc_memory'] } },
    { input: "quit", expect: {} },
    // Second session — re-open with the persisted DB
    { input: "__reopen_scene__", expect: {
        state_log_includes: { tool_name: 'get_npc_memories', agent_id_pattern: 'barkeep_marta' },
    }},
  ],
  defends_tripwire: null,  // behavioral, not a numbered tripwire
} satisfies EvalScenario;
```

### Runner

`npm run eval` discovers `tests/eval/*.eval.ts`, runs each scenario against the engine with the real LLM (or the recorded fixture if `RECORD_LLM_FIXTURES` was run), asserts the `expect` blocks against `state_log` and `roll_log`, and emits a per-scenario pass/fail report to stdout.

Eval tests are **slow** (one or more real LLM calls per step) and **expensive** (tokens). Do not run on every commit. Run:
- Nightly in CI via a scheduled job
- On demand: `npm run eval -- --scenario dm-asks-for-check`
- Before a release

Eval failures **do not block PR merge by default.** They raise an alarm. An eval failure means one of: the LLM changed its behavior (real signal — investigate); a prompt was tuned in a way that broke the behavioral contract (fix the prompt or update the eval expectation deliberately); the test fixture is stale (re-record). Eval failures are engineering signals, not code bugs. Treat them like a warning light, not a red gate.

---

## 7. What we explicitly do NOT test

- **Prompt text.** Prompts evolve constantly. Any assertion on prompt wording, structure, or length is testing volatility, not behavior. The only assertions on prompts are that the session-zero block is present (a structural check — see AC-18 in `spec/15-v01-milestone.md`) and that session config is injected (tripwire #14).
- **Internal class structure, private methods, or helper module boundaries.** Import paths in tests must stay on the public surfaces listed in §2. No exceptions.
- **LLM output format quirks.** Whether the model uses markdown bullets, how it capitalizes NPC names, whether it says "Critical Success" or "crit success." These are not behavioral contracts.
- **Token counts.** Not until a cost-per-turn budget exists and a gate is explicitly designed. Speculative `expect(tokenCount).toBeLessThan(500)` assertions will rot the moment the context changes.
- **Performance.** No `expect(duration).toBeLessThan(100)` assertions until a perf budget is defined and the benchmark methodology is agreed. The only timing assertion in v0.1 is AC-01 (CLI cold-start < 3 seconds), which is a subprocess test with an explicit rationale.
- **LLM determinism.** Even with the same seed and same prompt, the LLM is not deterministic. Fixture replay provides determinism for CI; assertions on "the LLM will always say X" are not allowed outside evals, and even there the assertion is on tool calls and state, not on narration text.

---

## 8. Coverage gates

Coverage is informational. The agent has not made the milestone by hitting a coverage number — only by making the milestone tests green.

Realistic targets, not aspirational:

| Surface | Line coverage target | Rationale |
|---|---|---|
| `src/schema/` | 80% | Schemas and factories should be exhaustively exercised; if a schema shape is untested, it is likely wrong |
| `src/engine/` | 60% | Public API exercised by scenario tests; internal branching not fully coverable without LLM |
| `src/loader/` | 60% | Happy path + known failure modes; edge cases are long-tail |
| `src/tools/` | 60% | Every tool's contract tested; error paths tested by Zod validation tests |
| `src/agents/` | **No gate** | Agent behavior is LLM-driven; line coverage is meaningless here; eval tests are the quality signal |
| `src/cli/` | 50% | IO behavior tested via subprocess + in-memory adapter; internal wiring is secondary |

The `npm run check` script does **not** gate on coverage. Coverage is reported; it does not block. Coverage is checked periodically by a human, not automatically enforced in CI. An agent that reaches 95% coverage on `src/agents/` by mocking the LLM away entirely has gamed the metric and tested nothing.

---

## 9. Common TDD mistakes the implementing agent will make

1. **Writing implementation first, then a test that asserts what the implementation already does.** Tell: the test passes the moment you write it. A test that was never red has not proven anything. If you cannot write a failing test first, reconsider whether the behavior is actually specified.

2. **Importing from internal modules in tests.** Tell: `grep "from '../../src/agents\|from '../../src/engine/internal"` in the `tests/` directory should return zero hits. If a test needs to reach inside an agent, the test is wrong — expose the behavior at a public surface instead.

3. **Asserting on prompt text.** Tell: the test breaks the moment anyone tunes a prompt, even a tuning that improves behavior. Every assertion on a prompt string is future test maintenance work with zero behavioral signal.

4. **Mocking too much — mocking the schema, mocking SQLite, mocking the tool surface.** Tell: if your test mocks the schema, it is testing the mock, not the schema. Use real SQLite (in-memory), real schemas, real tool functions. Mock only the LLM.

5. **Skipping the refactor step.** Tell: after a test goes green, the implementation is correct but rarely clean. The refactor step is when duplication gets removed, names get fixed, and abstractions get drawn. Tests still pass after refactoring — that is the proof the refactor is safe. An agent that never refactors accretes complexity with every green test.

6. **Writing "should" tests with no specific assertion.** `it('should work correctly', () => { ... })` with a vague expect is worse than no test — it gives false confidence. Every test name describes an observable outcome: `it('check() writes roll_log row with seed_offset before returning result', ...)`. The name is the spec.

---

## 10. Pre-commit and CI gates

`npm run check` is the local gate. It runs: `tsc --noEmit && eslint src/ && vitest run`. All unit, integration, and scenario tests must pass. Eval tests run separately via `npm run eval`. CI runs `npm run check` on every push. PRs are blocked on a red `check`.

The grep-based CI assertions (tripwires #3, #6, #7, #8 — see `spec/13-risks-tripwires.md`) run as vitest tests inside the `check` suite, not as shell scripts. They are owned by the test suite, not by a CI config file, so they cannot be bypassed by CI environment changes.

**The agent must never commit a known-failing test as "in progress."** If a test is red:
- Fix the code. (Preferred.)
- Or mark it `it.todo('reason — <date>')` with a comment explaining why it is deferred and a link to the relevant open question or design note.

A committed red test is a lie about the state of the codebase. `it.todo` is honest and does not block the suite. There is no third option.
