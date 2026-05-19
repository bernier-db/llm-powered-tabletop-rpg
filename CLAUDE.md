# RolePlaying Game

An LLM-powered RPG engine. Currently in **design phase — no code yet**.

## What this project is

An engine that runs RPG campaigns end-to-end:
- DM (narrator) agent with persistent state and faithful "DM craft"
- NPC actor agents with their own memory and voice
- AI party members with autonomy gates
- Deterministic rules engine (dice, combat, level-ups)
- World, NPC, and encounter generation
- Multimodal output: text, voice (TTS/STT), image
- Modular interfaces: solo / solo+AI-party / multiplayer table

Target ruleset: **Pathfinder-lightweight** (see `spec/03-rules-combat.md`).

## Where the spec lives

All spec documents are in `spec/`. Start with **`spec/README.md`** for the index.

When you start a session, the typical pattern is:
1. Read `spec/README.md` to orient
2. Check `spec/TODO-BRAINSTORM.md` for explicitly-flagged open threads
3. Check `spec/OPEN-QUESTIONS.md` for pending decisions
4. Read only the topic file(s) you're actively deepening

## Working assumptions (subject to change)

- **Language**: leaning TypeScript. Likely libs: `better-sqlite3`, `sqlite-vec`, `@anthropic-ai/sdk`, `zod` for tool-arg validation.
- **Storage**: markdown (authored campaigns in git) + SQLite (runtime state) + sqlite-vec (semantic recall) + relationships table for the "graph."
- **Stack-agnostic for now** — design first, implement later.

## Frontmatter convention (all spec files)

Every file under `spec/` carries YAML frontmatter:

```yaml
---
title: <human title>
status: AGREED | DRAFT | OPEN | DEFERRED | REFERENCE | INDEX
summary: <one-line, ~120 chars, what this file covers>
related: [list of file paths within spec/ or ..]
updated: YYYY-MM-DD
---
```

This enables three workflows:

1. **Selective reading** — `Read` a file with `limit=10` to get just the frontmatter; decide whether to load the rest.
2. **Cross-file filtering** — `grep -l "status: AGREED" spec/*.md` returns settled docs vs. in-progress.
3. **Cross-reference following** — the `related:` field encodes the local doc graph; load neighbors as needed.

When you edit a file, update its `updated` field. When you add a new spec file, give it frontmatter and add it to `spec/README.md`.

## Status legend

- **DRAFT** — initial sketch, may change significantly
- **AGREED** — explicit alignment reached
- **OPEN** — actively under discussion
- **DEFERRED** — captured but parked for later
- **REFERENCE** — external research synthesis (relatively stable; update on re-research, not on design decisions)
- **INDEX** — a navigation/index file (e.g., `spec/README.md`)

## When deepening a topic

- Update the relevant topic file directly; mirror the structure of neighbors
- If a file passes ~250 lines, consider splitting
- Cross-reference other files explicitly (`see 02-tools-orchestration.md`)
- New threads/topics → add an entry to `spec/TODO-BRAINSTORM.md` so future sessions know they exist

## Legacy

The original single-file brainstorm is preserved at `BRAINSTORM.md` (now a redirect). All content has been split into `spec/`.
