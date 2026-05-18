---
title: Solo Free Play — Default Turn Loop
status: DRAFT
summary: Baseline scenario diagrams. DM agent holds the floor; the router defers to an NPC actor for substantial dialogue. Every other scenario is a variation on this loop.
related: [../../02-tools-orchestration.md, ../../00-overview.md, 02-combat-encounter.md, 03-npc-reencounter-memory.md]
updated: 2026-05-17
---

# Solo Free Play — Default Turn Loop

**Source**: [`02-tools-orchestration.md`](../../02-tools-orchestration.md), [`00-overview.md`](../../00-overview.md)

The baseline scenario: one human player, the DM agent holding the floor most
of the time, with occasional handoffs to an NPC actor agent for substantial
dialogue. This is the spine — every other scenario is a variation on it.

## Conceptual view

Who exists, what they can touch, who decides who speaks next.

```mermaid
flowchart LR
    Player([Human Player])

    subgraph Engine[Engine process]
        Router{{Router<br/>floor-holder picker}}
        DM[DM / Narrator Agent]
        NPC[NPC Actor Agent<br/>spawned per NPC]
        Tools[Tool Surface<br/>gated per agent]
    end

    subgraph Stores[State & memory]
        SQL[(SQLite<br/>runtime state)]
        Vec[(sqlite-vec<br/>codex + memories)]
        MD[(Markdown<br/>authored canon)]
    end

    RE[Rules Engine<br/>deterministic dice]

    Player -- input --> Router
    Router -- holds floor --> DM
    Router -. defer_to npc_id .-> NPC
    DM -- check / attack / state read+write --> Tools
    NPC -- redacted reads, dialogue only --> Tools
    Tools <--> SQL
    Tools <--> Vec
    Tools -- read seed on load --> MD
    Tools -- delegate dice --> RE
    DM -- narration --> Router
    NPC -- dialogue + proposed action --> Router
    Router -- response stream --> Player

    classDef agent fill:#e8f0ff,stroke:#4a6fa5
    classDef store fill:#fff4e0,stroke:#b8862f
    classDef infra fill:#eee,stroke:#666
    class DM,NPC agent
    class SQL,Vec,MD store
    class Router,Tools,RE infra
```

**Key invariants visible above** (enforced by the tool layer, not the prompt):

- Only one agent holds the floor at a time. The Router is the only thing that picks the next speaker.
- Agents never touch storage directly — everything funnels through the Tool Surface.
- The DM cannot call `roll()`; it must request resolution via `check` / `attack`, which run in the Rules Engine.
- NPC reads are redacted to what that NPC plausibly knows; redaction lives in the tool layer.

## One beat — sequence

The default cadence when nothing exotic happens. Most of the screen time is in
the `RESOLVING → NARRATING → COMMITTING` band.

```mermaid
sequenceDiagram
    autonumber
    actor P as Player
    participant R as Router
    participant DM as DM Agent
    participant T as Tool Surface
    participant RE as Rules Engine
    participant S as State Store

    P->>R: input ("I search the desk")
    R->>DM: hold floor, current scene context
    DM->>T: get_scene / get_actor / query_codex
    T->>S: read
    S-->>T: scene + actor + relevant cold recall
    T-->>DM: context payload
    DM->>T: check(actor_id, "perception", DC=15)
    T->>RE: roll d20 + mods vs DC
    RE-->>T: outcome { degree: success, total: 19 }
    T-->>DM: result
    DM->>T: transfer_item(desk → player, "letter")
    T->>S: write (audited)
    DM-->>R: narration stream + proposed_state_changes
    R-->>P: streamed narration
    Note over R,S: scene.append(narration); loop back to AWAITING_INPUT
```

## When the DM defers to an NPC

The trigger is "substantial dialogue" — more than a one-liner, especially when
the NPC has a distinct voice or hidden agenda the DM shouldn't speak for.

```mermaid
sequenceDiagram
    autonumber
    actor P as Player
    participant R as Router
    participant DM as DM Agent
    participant N as NPC Agent (Vellis)
    participant T as Tool Surface
    participant S as State Store

    P->>R: "I ask Vellis what he knows about the cult"
    R->>DM: hold floor
    DM->>R: defer_to(npc_id="vellis")
    R->>N: hold floor, scene + redacted Vellis view
    N->>T: get_npc_memories(npc_id="vellis", related_to=[party])
    T->>S: read memories + disposition
    S-->>T: top-K memories, disposition deltas
    T-->>N: memory bundle + voice exemplar
    N-->>R: dialogue + intent { withhold | reveal | lie }
    R->>DM: resume floor, NPC turn payload
    DM-->>R: framing ("Vellis glances at the door...") + commits
    R-->>P: streamed response
```

The NPC agent never narrates the scene itself — it returns dialogue and an
*intent*. The DM resumes and frames the result. This is what kills the
"DM speaks, NPC speaks, DM speaks again in the same beat" tic.

## See also

- Turn-loop state machine (zoomed out): [`02-tools-orchestration.md`](../../02-tools-orchestration.md) §Turn-loop state machine
- What "redacted view" actually means: [`02-tools-orchestration.md`](../../02-tools-orchestration.md) §Agent permissioning matrix
- Where memories come from: [`03-npc-reencounter-memory.md`](03-npc-reencounter-memory.md)
