---
title: TODO — Threads Still To Brainstorm
status: OPEN
summary: Menu of design threads explicitly flagged for future work — campaign authoring, state schema, agent prompts, session zero, summarizer, save/branching, model mix, multimodality, real-time web.
related: [OPEN-QUESTIONS.md, 05-director.md, 09-multimodality.md, 10-campaign-design.md, 11-dm-styles-tones.md]
updated: 2026-05-17
---

# TODO — Threads Still To Brainstorm

Topics that have been **explicitly flagged** for design discussion but not yet covered in depth. When picking up a session in Claude Code, this is the menu of work-in-waiting.

## Major threads (offered, not yet picked up)

### Director & campaign authoring
**Why it matters**: this is the "DM craft" layer — what separates a competent engine from one that runs *good* campaigns.

**Research foundation now in place**: [`10-campaign-design.md`](10-campaign-design.md) covers structural templates (node-based, 5-Room, Score, Front, Lazy adventure), faction/clock mechanics, foreshadowing discipline, and the engine implications list. Use that as the starting point.

What needs to be designed (deepening from the research):
- Markdown file structure for a campaign (`campaigns/red_sigil/` — what files? what frontmatter?) — should match the node-graph schema from §11.1
- How beats are expressed (node + clue-edges + stakes question)
- How fronts and faction clocks are authored in markdown
- How foreshadow seeds get tagged for retrieval-by-context
- How the Director picks among queued seeds mid-play (§11.2 design)
- Session structure templates (Lazy DM 8-step as a JSON schema — §11.4)
- The `world_facts` ledger (§11.7 quantum-ogre guardrail) — schema and write/read protocol
- Module compatibility / versioning

Current sketch lives in [`05-director.md`](05-director.md).

### Concrete state-store schema
**Why it matters**: we've sketched shapes; we haven't nailed down the actual TypeScript types and SQLite DDL for every entity. This is gating real implementation.

What needs to be designed:
- TypeScript types for Actor, Scene, NPC Memory, Faction, Quest, Item, Relationships, Roll Log, Campaign State, Foreshadow Queue
- SQLite DDL with indexes, foreign keys, JSON columns
- Migration story (how do schema changes get applied?)
- Example records for each entity (round-trip test data)
- The relationships table — what relation types? What metadata?
- Vector tables (sqlite-vec) — what gets embedded, with what dimensions, at what granularity?

Schemas currently scattered across [`07-geography.md`](07-geography.md), [`04-npc-memory.md`](04-npc-memory.md), [`06-generation.md`](06-generation.md). Need a consolidated reference.

### Agent prompts & orchestration in detail
**Why it matters**: the tool surface is sketched, but the actual prompts each agent receives — and the format of messages between agents — is undefined.

What needs to be designed:
- DM agent system prompt + per-turn context layering (concrete templates)
- NPC actor prompt — including the redacted-knowledge view, voice register, memory injection
- Combat agent prompt — initiative state, current actor turn, tactics
- Director prompt — campaign skeleton + current clocks + spotlight + foreshadow queue
- Companion prompt — drives + autonomy gates
- The router protocol — what message shape do agents exchange? How is handoff signaled?
- Voice-distinction techniques — how to keep NPC voices distinct over hundreds of turns (speech sample exemplars, vocabulary biasing, register tags)
- Error handling — what happens when an agent returns invalid tool calls or off-format output?

## Implicit threads (touched but not deepened)

### Session zero
**Research foundation now in place**: [`11-dm-styles-tones.md`](11-dm-styles-tones.md) §5 (safety tooling) and §8 (engine implications) lay out the consent stack and the tone/style configuration model.

What needs to be designed:
- Concrete schema for tone × style × content-lines × veils × lethality × pacing × combat-granularity
- How content lines are *enforced* (block at generation vs. fade-to-black vs. soft-divert) — see §8.8 two-layer approach
- Per-tone prompt-fragment library (§8.2 vocabulary biasing) — concrete fragment text
- Per-style orchestration bundles (§8.5) — system prompts + tool policies
- The "tone-keeper" guardrail pass (§8.10) — implementation
- The "tone diary" subsystem (§8.12) — schema + write hooks + read at session start

Current sketch: [`08-cross-cutting.md`](08-cross-cutting.md).

### The summarizer
- Prompt design for hot→warm compression
- How to measure it preserves the right things (eval scenarios)
- Cadence tuning (every N turns, every X tokens, time-based?)
- Selective preservation (combat detail vs. small talk)

Current sketch: [`08-cross-cutting.md`](08-cross-cutting.md).

### Save / load + branching
- Save file format — bare DB, or DB + metadata bundle, or DB + assets bundle?
- Branching UX — "rewind to before that decision" affordance
- Retention policies — auto-cleanup of stale branches?
- Cross-version save compatibility (when schema changes)

Current sketch: [`08-cross-cutting.md`](08-cross-cutting.md).

### Cost optimization / model mix
- Concrete tiering: which calls use which model size?
- Cost-per-turn budget and how it's enforced
- Quality vs. cost gates — when do we upgrade a routine call to the big model?
- Streaming vs. complete responses — when is each appropriate?

Current sketch: [`08-cross-cutting.md`](08-cross-cutting.md).

### Multi-campaign persistence
- World-across-campaigns vs. campaign-isolated
- Reputation portability for PCs
- Cross-campaign NPC cameos
- The "shared universe" object model

Current sketch: [`08-cross-cutting.md`](08-cross-cutting.md). Currently **DEFERRED** — see [`OPEN-QUESTIONS.md`](OPEN-QUESTIONS.md).

### Eval / test harness
- Scripted-scenario format
- Pass/fail criteria for DM behavior
- Cost-dashboard implementation
- CI integration
- Periodic re-eval as models change

Current sketch: [`08-cross-cutting.md`](08-cross-cutting.md).

## Major thread (newly raised, fully open)

### Multimodality — TTS, STT, image gen
**Why it matters**: not just feature wiring — has real architectural implications for asset storage, latency, agent design, cost.

Stub file with the question set: [`09-multimodality.md`](09-multimodality.md).

Big subquestions:
- Vendor selection (TTS, image-gen)
- Image consistency strategy across re-renders (this is the hard one)
- Per-NPC voice profile schema and routing
- Streaming protocol for text + audio + images out-of-order
- Cost budget enforcement and graceful degradation
- Multimodal input (player uploads a sketch)

## Newly raised threads (not yet addressed)

### Real-time web for remote multiplayer play
**Why it matters**: turning the engine into a hosted real-time multiplayer experience.

Lift assessment from initial discussion: roughly 1–2 months to MVP because the architecture is already shaped for it (Actor abstraction with `controller: 'human'` per actor; engine state in SQLite, not in connections; LLM output already streamed).

What needs to be designed:
- WebSocket transport layer (likely `ws` or `socket.io` on Node)
- Auth + session/room model (account system? guest sessions? campaign instances?)
- Connection lifecycle (reconnect, missed events, presence)
- Per-player input/output channels (private whispers, hidden rolls)
- Web UI scope for MVP (character sheets, scene view, dice, chat)
- Deploy story (single-tenant hosted? self-hostable? Electron desktop?)

This is implementation-track, not design-track — defer until core engine is real.

---

## How to use this file

When starting a session, scan this list and pick a thread. After deepening one:
1. Move the relevant content into the appropriate topic file (or create a new one)
2. Remove or update the entry here
3. If new sub-threads emerge, add them
