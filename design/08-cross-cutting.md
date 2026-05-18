---
title: Cross-cutting Concerns
status: DRAFT
summary: Deterministic RNG, hot→warm summarizer, session zero, save/load + branching, cost optimization, multi-campaign persistence, eval harness.
related: [00-overview.md, 02-tools-orchestration.md, 11-dm-styles-tones.md, TODO-BRAINSTORM.md]
updated: 2026-05-17
---

# Cross-cutting Concerns

Infrastructure-level concerns that touch many parts of the engine. Most of these need further deepening — see [`TODO-BRAINSTORM.md`](TODO-BRAINSTORM.md).

## Deterministic RNG per session

- Seed the RNG per session and log every roll for replay
- Enables: replay debugging, deterministic testing, "rewind to before that roll" feature
- The `roll_log` table is the audit trail; every roll has session_id, seed offset, context

## Summarizer (hot → warm memory compression)

- Runs every K turns (K TBD; ~10–20 likely)
- Replaces verbatim transcript with a tight summary preserving:
  - Named entities introduced
  - Decisions made
  - Rolls and their outcomes
  - Emotional beats
- Pruned: small talk, repeated descriptions, action-by-action combat detail
- Without this, long sessions balloon into hundreds of thousands of tokens

**Open**: prompt design for the summarizer; how to test it preserves the right things.

## Session zero

A setup step where the player picks:
- **Tone** — gritty / heroic / comedic / horror / political / sandbox
- **Content lines** (will not appear) and **veils** (will fade-to-black)
- **Lethality** — cinematic (PCs rarely die) / standard / brutal (PCs die)
- **Pacing preference** — fast-cut vs. slow-burn
- **Combat granularity** — narrative vs. tactical

Every agent reads these. This is what keeps the engine usable for very different playstyles.

**Open**: full schema; how content lines are enforced (block content vs. fade-to-black); how tone biases NPC voice/Director pacing.

## Save / load + branching

- A save = a copy of the runtime SQLite file
- Branching saves ("what if I hadn't killed him?") = extra copies
- Falls out for free if scenes are immutable

**Open**: save file format (bare DB, or DB + metadata bundle), how to expose branching in the UI ("rewind" affordance), retention policies.

## Cost optimization / model mix

Single model for everything is expensive. Likely mix:
- **Big model** for DM/Director and significant NPC interactions
- **Small model** for routine narration, mundane NPC small talk, summarization, simple combat resolution
- **Tiny model** for tool-argument routing if needed

**Open**: when does each tier kick in? Cost-per-turn budget? Quality vs. cost gates?

## Multi-campaign persistence

Open question: does a world persist *across* campaigns (multi-campaign shared universe), or is each campaign isolated?

- Pro: shared universe → NPCs cameo across campaigns, reputation travels with a PC, world feels deeper
- Con: more complex state model, save-file portability becomes harder, balance issues across campaigns

**DEFERRED** — see [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md).

## Eval / test harness

How do you measure whether the DM is doing a good job?

- Scripted scenarios that test specific behaviors:
  - Does the DM call `check()` instead of inventing the outcome?
  - Does the NPC remember a prior interaction?
  - Does the engine respect content lines?
  - Does the Director advance faction clocks on schedule?
- Behavioral checks on agent outputs
- A/B testing different prompts on the same scripted scenario
- Cost dashboards (tokens per turn, per session, per NPC agent)

**Open**: scenario format; pass/fail criteria; CI integration; periodic re-eval as models change.
