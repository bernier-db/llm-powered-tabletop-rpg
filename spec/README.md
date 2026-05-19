---
title: Design Index
status: INDEX
summary: Navigation map for all design documents. Start here.
related: [../CLAUDE.md, TODO-BRAINSTORM.md, OPEN-QUESTIONS.md, architecture/README.md, 14-glossary.md, 16-test-strategy.md]
updated: 2026-05-18
---

# Design — Index

Read in order if you want the whole picture; otherwise pick the topic you need.
Status legend defined in root `CLAUDE.md`.

Every design file carries YAML frontmatter (`title`, `status`, `summary`, `related`, `updated`). Read just the first ~10 lines of any file to get its metadata before deciding to load the rest.

## Core architecture
- [`00-overview.md`](00-overview.md) — goals, status, four-layer architecture, actor model, agent layout
- [`01-storage.md`](01-storage.md) — markdown / SQLite / sqlite-vec / relationships
- [`02-tools-orchestration.md`](02-tools-orchestration.md) — tool surface, router, agent permissioning, turn loop

## Mechanics
- [`03-rules-combat.md`](03-rules-combat.md) — Pathfinder-lightweight choices + combat loop
- [`04-npc-memory.md`](04-npc-memory.md) — NPC memory model + disposition
- [`05-director.md`](05-director.md) — backstage planner that runs between scenes

## Generative & spatial
- [`06-generation.md`](06-generation.md) — world/NPC/encounter/item generation pipeline
- [`07-geography.md`](07-geography.md) — spatial model, movement, GeoJSON discussion

## Infrastructure & UX
- [`08-cross-cutting.md`](08-cross-cutting.md) — RNG, summarizer, session zero, saves
- [`09-multimodality.md`](09-multimodality.md) — TTS, STT, image generation ⚠️ **STUB — to be filled**

## Craft references (research syntheses)
- [`10-campaign-design.md`](10-campaign-design.md) — TTRPG campaign/scenario design best practices (Alexandrian, Lazy DM, PbtA, BitD, OSR)
- [`11-dm-styles-tones.md`](11-dm-styles-tones.md) — DM styles and tone calibration (GNS, Laws, Baker, Cook, Mercer-discourse)

## Architecture diagrams
- [`architecture/`](architecture/README.md) — mermaid diagrams per scenario (conceptual + tool-call level): core loops, party shapes, backstage systems, generation, travel

## Implementation guardrails
- [`13-risks-tripwires.md`](13-risks-tripwires.md) — 18 numbered tripwires for autonomous coding agents; ordered by severity; each with why, how to detect, and canonical source

## Milestones
- [`15-v01-milestone.md`](15-v01-milestone.md) — v0.1 acceptance criteria, end-to-end scenario test, scope table, and implementation order; the autonomous agent's target for the first vertical slice

## Test policy
- [`16-test-strategy.md`](16-test-strategy.md) — canonical test policy: inverted pyramid, MockLLMClient, RNG pinning, observable-surface-only assertions, CI gates; cited by engineering CLAUDE.md

## Reference
- [`14-glossary.md`](14-glossary.md) — canonical definitions for every term used across the design; drift report

## Working files
- [`TODO-BRAINSTORM.md`](TODO-BRAINSTORM.md) — threads explicitly flagged for design discussion
- [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md) — decisions deferred
- [`FUTURE.md`](FUTURE.md) — post-v1 parking lot

## Suggested reading order for a fresh session
1. Root `CLAUDE.md`
2. `00-overview.md` (architecture in one page)
3. `TODO-BRAINSTORM.md` (what's open)
4. Whatever topic file the current work needs

For **DM-craft grounding** (what good DMing looks like, so engine behavior can be evaluated): read `10-campaign-design.md` and `11-dm-styles-tones.md` before deepening the Director, scenario generator, or session-zero subsystems.
