---
title: Director
status: DRAFT
summary: Between-scenes planner that advances faction clocks, injects foreshadowing, manages spotlight, and writes a scene brief for the DM agent.
related: [00-overview.md, 10-campaign-design.md, 11-dm-styles-tones.md, 04-npc-memory.md]
updated: 2026-05-17
---

# Director

The most underbuilt part of most LLM-DMs. The Director is **not** a narrator — it's a backstage planner that runs **between scenes**.

## Inputs

- Campaign skeleton (beats, branches, win/lose conditions)
- Current faction clocks (segmented progress bars for each antagonist faction's goal)
- Time elapsed since each NPC last appeared
- Foreshadow queue (seeds waiting to be planted)
- Spotlight tracker (which PCs have been central recently)
- Recent scene history (warm summary)

## Outputs (written to campaign_state, consumed by next scene)

- **Scene pressure** — what's visibly different since the party last looked? Faction clocks have advanced — what's the visible evidence?
- **NPC schedule** — which off-screen NPCs are doing what, and are any about to intersect the party's path?
- **Foreshadow injection** — pull 1–2 seeds from the queue that fit the current location/situation (a poster, an overheard rumor, a familiar symbol).
- **Pacing call** — are we in a lull? Time to escalate a clock. Recently came off a big fight? Give a breather scene.
- **Spotlight nudge** — which PC is overdue for a moment? Suggest the next scene feature their background or skills.

The Director writes a short **scene brief** the DM agent reads at scene start — a stage manager handing the director their notes.

## "Best DM practices" scaffolds

These live in the Director, not the DM:

- **Fail-forward by default** — failed rolls advance the story sideways, not into a brick wall. The rules engine returns "fail, but…" prompts to the DM.
- **Spotlight tracker** — count how many scenes each PC has been central in; the Director nudges scenes toward neglected characters.
- **Faction clocks** — every major antagonist faction has a 4–8 segment clock ticking toward their goal. Player inaction has visible cost.
- **Foreshadowing queue** — the Director plants 2–3 seeds ahead of major reveals so twists feel earned.
- **Session zero state** — tone, content lines, pacing preferences stored once and consulted by every agent.

## When the Director runs

- Between scenes (its primary cadence)
- After significant time advances (e.g., long travel) — see [`07-geography.md`](07-geography.md)
- On explicit scene-break signal from DM agent

## Director does NOT

- Speak to the player
- Mid-scene intervene (would break flow)
- Override player choice (it nudges, never forces)

## Open

- How is a campaign skeleton actually authored? Markdown structure for beats, branches, faction definitions, foreshadow seeds — **TODO** (see [`TODO-BRAINSTORM.md`](TODO-BRAINSTORM.md)).
- Foreshadow priority/decay — how the Director picks among queued seeds.
- Tension curves — should the Director model an explicit dramatic arc across a session?
