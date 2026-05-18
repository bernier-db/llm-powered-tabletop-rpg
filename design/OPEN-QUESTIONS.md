---
title: Open Questions
status: OPEN
summary: Decisions raised but deliberately deferred (stack, UI choice, LLM backend, persistence boundary, multimodality vendors). Distinct from TODO-BRAINSTORM (topics) — this is decisions.
related: [TODO-BRAINSTORM.md, 08-cross-cutting.md, 09-multimodality.md, ../CLAUDE.md]
updated: 2026-05-17
---

# Open Questions

Decisions that have been raised but deliberately deferred. Different from [`TODO-BRAINSTORM.md`](TODO-BRAINSTORM.md) (which lists *topics to discuss*); this lists *decisions to make*.

## Stack

**Leaning**: TypeScript.

Why: best fit for modular interfaces (web UI + Discord multiplayer + CLI all share one backend); user's preferred language; strong ecosystem for SQLite + LLM tools.

Likely libs:
- `better-sqlite3` (synchronous, fast)
- `sqlite-vec` (vector search as a SQLite extension — same DB file)
- `@anthropic-ai/sdk`
- `zod` for runtime tool-arg validation
- Web UI candidates: React / Svelte / SolidJS
- Discord: `discord.js`

**Alternatives considered**:
- **Python** — fastest to prototype; viable if we want shortest path to working DM loop. Cost: two-stack story if we later add web UI.
- **C#** — relevant only if long-term destination is a Unity-based game or rich native desktop app. Currently not the case.

## UI / interfaces

- Text/CLI for v1?
- Web UI as primary, or after CLI prototype?
- Discord bot for multiplayer table?
- Single interface or modular front-ends sharing one engine?

Engine is being designed to support all three; **which to build first** is the question.

## LLM backend strategy

- Single model for everything (simple, expensive)
- Tiered mix: big for DM/Director/major NPCs, small for routine narration / NPC small talk / summarization / combat resolution, tiny for routing

When does each tier kick in? Cost-per-turn budget? Quality gates? See [`08-cross-cutting.md`](08-cross-cutting.md).

## Persistence boundary

Does a world persist *across* campaigns (multi-campaign shared universe), or is each campaign isolated?

**DEFERRED** — see [`08-cross-cutting.md`](08-cross-cutting.md) for the trade-offs.

## XP vs milestone leveling

PF-style XP, milestone-based leveling, or hybrid? See [`03-rules-combat.md`](03-rules-combat.md).

## Multimodality vendor choices

- TTS: ElevenLabs / OpenAI TTS / Cartesia / local Coqui or Piper?
- Image gen: Replicate / Stability / Recraft / something else?
- Image consistency strategy: reference-image conditioning, per-NPC LoRA, canonical prompt+seed?

See [`09-multimodality.md`](09-multimodality.md).

## Tooling notes

- **GSD** — "Get-Shit-Done" skill library for Claude Code. Not installed in the session this brainstorm was generated in. Install via the plugin/skill system to make available in future Claude Code sessions.
