---
title: Solo + AI Companion — Autonomy Gates
status: DRAFT
summary: How a Companion agent sits in the actor mix, how drives/lines and spotlight budget gate spontaneous action, and how players override or pause its autonomy.
related: [../../00-overview.md, ../../02-tools-orchestration.md, 02-multiplayer-table.md, ../backstage/01-director-between-scenes.md]
updated: 2026-05-17
---

# Solo + AI Companion — Autonomy Gates

**Source**: [`00-overview.md`](../../00-overview.md) §Agent layout, [`02-tools-orchestration.md`](../../02-tools-orchestration.md)

A Companion is a party-facing actor controlled by an agent rather than a
human. The trick: it shouldn't *steal* scenes from the player. The Companion
agent is governed by **autonomy gates** — drives (what this character cares
about) and lines (what they won't do) — that decide whether they speak / act
spontaneously or stay silent and let the player drive.

## Conceptual view — where the Companion sits

```mermaid
flowchart LR
    Player([Human Player])

    subgraph Engine[Engine]
        R{{Router}}
        DM[DM Agent]
        Comp[Companion Agent<br/>autonomy-gated]
        NPC[NPC Actor Agent<br/>per encounter]
        T[Tool Surface]
        AG[Autonomy Gate<br/>drives · lines · spotlight]
    end

    subgraph Stores[State]
        Sheet[(Companion sheet<br/>+ drives + lines)]
        Mem[(Companion memory<br/>scoped to party-public + own)]
        SQL[(SQLite)]
    end

    Player --> R
    R -- floor --> DM
    R -. floor on Companion turn .-> Comp
    R -. spotlight check .-> AG
    AG -. allow speak/act .-> Comp
    AG -. suppress (player has the moment) .-> R
    DM <--> T
    Comp <--> T
    NPC <--> T
    T <--> SQL
    Sheet --> Comp
    Mem --> Comp

    classDef agent fill:#e8f0ff,stroke:#4a6fa5
    classDef gate fill:#fde,stroke:#a33
    classDef store fill:#fff4e0,stroke:#b8862f
    classDef infra fill:#eee,stroke:#666
    class DM,Comp,NPC agent
    class AG gate
    class Sheet,Mem,SQL store
    class R,T infra
```

## How the gate decides

The Companion has *opinions*, but firing them every beat is exhausting.
The gate filters them.

```mermaid
flowchart TB
    Trigger[Scene event<br/>player speaks · enters location · gets hit]
    Eval[Gate evaluation]
    D{Does this hit a<br/>drive or line?}
    S{Is the player<br/>mid-spotlight?}
    C{Recent companion<br/>floor-time over budget?}
    Speak[Companion takes a beat<br/>dialogue or action]
    Stay[Companion stays silent<br/>maybe internal note only]

    Trigger --> Eval --> D
    D -- no --> Stay
    D -- yes --> S
    S -- yes --> Stay
    S -- no --> C
    C -- yes --> Stay
    C -- no --> Speak

    classDef pos fill:#dfd,stroke:#393
    classDef neg fill:#fde,stroke:#a33
    class Speak pos
    class Stay neg
```

`Drives` are short structured tags (e.g. `drive: "redeem brother's memory"`,
`drive: "protect children"`). `Lines` are hard rules (e.g. `line: "won't harm
the innocent"`). Both are stored on the Companion sheet and evaluated each
beat. Spotlight + floor-budget come from the Director's spotlight tracker
(see [`../backstage/01-director-between-scenes.md`](../backstage/01-director-between-scenes.md)).

## Sequence — a Companion intervenes mid-scene

The player is interrogating a child. The Companion has `line: "won't harm
the innocent"`. The gate fires.

```mermaid
sequenceDiagram
    autonumber
    actor P as Player (PC)
    participant R as Router
    participant DM as DM Agent
    participant AG as Autonomy Gate
    participant C as Companion Agent
    participant T as Tool Surface

    P->>R: "I grab the kid and shake him"
    R->>DM: hold floor
    DM->>T: get_scene + get_actors_in_scene
    Note over DM: scene includes Companion "Mira"
    DM->>AG: scene_event { type: harm_threat, target: child, by: PC }
    AG->>AG: check Mira.drives + Mira.lines
    AG-->>R: trigger Mira, priority HIGH
    R->>C: hold floor, redacted view + active intent
    C->>T: get_actor(self) + get_recent_relationship(self, PC)
    T-->>C: sheet + recent rapport
    C-->>R: intent { interpose verbally, grab PC's arm }<br/>+ dialogue
    R->>DM: resume floor, Companion turn payload
    DM-->>R: framing ("Mira's hand clamps your wrist...")
    R-->>P: narration
```

## Sequence — Companion proposes an action on their own turn

In combat or any actor-based round, the Companion is just another actor — the
Combat agent or DM asks it for intent on its turn.

```mermaid
sequenceDiagram
    autonumber
    participant CA as Combat Agent
    participant C as Companion Agent
    participant T as Tool Surface
    participant RE as Rules Engine

    CA->>C: "Mira, 3 actions. Wizard is bleeding, brigand near you."
    C->>T: get_actor(self) + own inventory + drives
    T-->>C: payload
    C-->>CA: intent { Stride→wizard, Cast(stabilize), Raise Shield }
    CA->>T: resolve each action in order
    T->>RE: stabilize check, etc.
    RE-->>T: outcomes
    CA-->>CA: narrate Mira's turn
```

## Player escape hatches

Players need to be able to overrule a Companion ("Mira, stand down") and to
freeze their autonomy when they want to drive the scene alone.

```mermaid
flowchart LR
    PCmd[Player says<br/>"Mira, hold"]
    Listen[Engine intercepts<br/>imperative-to-companion]
    Pause[Autonomy Gate<br/>suppress Mira N turns]
    Resume[Resume after N or on cue]

    PCmd --> Listen --> Pause --> Resume

    classDef ux fill:#eef,stroke:#669
    class PCmd,Listen,Pause,Resume ux
```

## See also

- Multiple humans + Companions at the same table: [`02-multiplayer-table.md`](02-multiplayer-table.md)
- Spotlight tracker (the Director input that the gate consults): [`../backstage/01-director-between-scenes.md`](../backstage/01-director-between-scenes.md)
- Why Companion reads are scoped: [`02-tools-orchestration.md`](../../02-tools-orchestration.md) §Agent permissioning matrix
