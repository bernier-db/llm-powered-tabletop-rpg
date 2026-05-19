---
title: Scenario / Encounter Generation
status: DRAFT
summary: JIT generation of scenes from region/situation encounter tables + LLM dressing tied to current canon, Director hints, and party context. Triggers, travel-segment flow, Director-driven escalation, lazy NPC engagement.
related: [../../06-generation.md, ../../07-geography.md, 02-entity-generation-pipeline.md, ../travel/01-party-movement-flow.md, ../backstage/01-director-between-scenes.md]
updated: 2026-05-17
---

# Scenario / Encounter Generation

**Source**: [`06-generation.md`](../../06-generation.md), [`07-geography.md`](../../07-geography.md)

A *scenario* in this engine is a self-contained scene: combat, parley, trap,
discovery, social tension. Most aren't pre-authored — they're generated on
demand from a region/situation encounter table, then dressed by the LLM with
*why* and *texture* that fits the current canon and party context.

This is the same two-layer pattern as
[`02-entity-generation-pipeline.md`](02-entity-generation-pipeline.md), but
the table rolls and dressing prompt differ.

## Conceptual view — what an encounter generation pulls together

```mermaid
flowchart LR
    Trig[Trigger<br/>travel segment · location arrival · Director clock<br/>· DM beat-pacing request]

    subgraph Skel[Procedural skeleton]
        ET[Region/situation encounter table<br/>weighted by terrain, danger, time-of-day]
        Type[Type: combat · parley · trap · discovery · social]
        Threat[Threat: trivial · low · moderate · severe · extreme]
    end

    subgraph Canon[Canon retrieval]
        Reg[Region context<br/>cultures, threats, recent events]
        Fac[Active faction clocks<br/>relevant antagonists]
        FS[Foreshadow queue<br/>seeds ripe to plant]
        Hot[Hot scene + warm summary]
        Spot[Spotlight: which PC is overdue]
    end

    subgraph Dress[LLM dressing]
        Why[Why is this happening?]
        Tex[Texture: sights, sounds, opening line]
        Hook[Connect to canon: which faction? which seed?]
    end

    Commit[Commit to scene<br/>+ optional encounter row if reusable]

    Trig --> Skel --> Dress
    Canon --> Dress
    Dress --> Commit

    classDef proc fill:#eef,stroke:#669
    classDef canon fill:#fff4e0,stroke:#b8862f
    classDef llm fill:#fde,stroke:#a33
    classDef ok fill:#dfd,stroke:#393
    class ET,Type,Threat proc
    class Reg,Fac,FS,Hot,Spot canon
    class Why,Tex,Hook llm
    class Commit ok
```

## Triggers — when scenario generation fires

```mermaid
flowchart TB
    A[Travel segment<br/>per-segment encounter roll]
    B[Location first-visit<br/>'what's happening here right now?']
    C[Director pacing call<br/>brief asks for escalation/breather]
    D[Faction clock tick<br/>visible evidence beat needed]
    E[DM explicit request<br/>"the party's hour passes uneventfully... or does it?"]

    A --> EncGen
    B --> EncGen
    C --> EncGen
    D --> EncGen
    E --> EncGen

    EncGen[Encounter generator]

    classDef trig fill:#eef,stroke:#669
    classDef gen fill:#fde,stroke:#a33
    class A,B,C,D,E trig
    class EncGen gen
```

Each trigger biases the skeleton roll: travel uses the terrain's table, a
faction clock tick biases toward that faction, a pacing "breather" call
biases away from combat.

## Sequence — travel segment encounter

The party is walking a forest trail. The travel system rolls on the segment's
encounter table.

```mermaid
sequenceDiagram
    autonumber
    participant MP as move_party() flow
    participant T as Tool Surface
    participant ET as Encounter Table<br/>(region/terrain)
    participant CanonQ as Canon Retrieval
    participant Gen as Generator Agent (LLM)
    participant Dir as Director Hook
    participant DM as DM Agent

    MP->>T: roll_segment_encounter(segment, terrain, danger, time)
    T->>ET: weighted roll
    ET-->>T: { type: "parley", threat: low, skeleton: "lone scout from rival faction" }

    T->>CanonQ: pull(parent_region, active_factions, foreshadow_queue, spotlight)
    CanonQ-->>T: bundle

    T->>Dir: check pacing call + any "plant seed here" hints
    Dir-->>T: "spotlight Alice, plant cult_symbol seed if natural"

    T->>Gen: prompt = skeleton + canon + director_hints + tone
    Gen-->>T: { opening_narration, scout_name, scout_voice, why_here,<br/>cult_symbol_on_cloak (planted seed), tactics_if_combat }

    T->>DM: scenario payload (becomes a sub-scene)
    DM->>DM: open scenario, narrate opening line
    Note over DM: party can resolve via dialogue, combat, sneak — engine doesn't care
```

## Sequence — Director-requested escalation

The Director's last brief flagged "pacing call: escalate". On the next
arrival, the engine generates a higher-pressure encounter than the table
would normally produce.

```mermaid
sequenceDiagram
    autonumber
    participant DM as DM Agent
    participant T as Tool Surface
    participant Dir as Director state
    participant ET as Encounter Table
    participant CanonQ as Canon Retrieval
    participant Gen as Generator Agent

    DM->>T: arriving_at(location_id)
    T->>Dir: get_scene_brief(current)
    Dir-->>T: { pacing_call: "escalate", spotlight: "alice", foreshadow_due: [cult_symbol] }

    T->>ET: weighted roll BIASED upward by escalate flag
    ET-->>T: { type: combat, threat: moderate, skeleton: "cult ambush" }

    T->>CanonQ: pull (active cult faction state, alice background, prior cult beats)
    CanonQ-->>T: bundle

    T->>Gen: prompt = skeleton + canon + "must include cult_symbol motif" + "give Alice a moment"
    Gen-->>T: { staged_ambush, cult_emblem_visible, hostage_NPC_calls_for_alice }

    T->>DM: scenario payload
    Note over DM: foreshadow seed pays off in same beat that gives Alice the spotlight
```

## Sequence — lazy NPC engagement during a scenario

The generated scenario references "a hostage NPC". Lazy-gen: only create the
hostage's full sheet if a player engages.

```mermaid
sequenceDiagram
    autonumber
    actor P as Player
    participant DM as DM Agent
    participant T as Tool Surface
    participant Sk as Skeleton Roller
    participant Gen as Generator Agent
    participant S as State Store

    Note over DM: hostage NPC exists as placeholder ref in scenario
    P->>DM: "I run to the hostage and ask her name"
    DM->>T: resolve_placeholder(npc_ref="hostage_in_cult_ambush")
    T->>Sk: roll_skeleton(npc, parent=scene, constraints={role: hostage})
    T->>Gen: full NPC gen (same pipeline as core entity gen)
    Gen-->>T: NPC entity
    T->>S: commit NPC + seed memories<br/>(includes "saved by Alice in cult ambush" if Alice acts)
    T-->>DM: hostage now real — name, voice, secret
    DM-->>P: dialogue
```

## What's reusable vs. one-shot

Some scenarios are worth keeping in the codex; most aren't.

```mermaid
flowchart LR
    G[Generated scenario]
    Q{Reusable or<br/>one-shot?}
    Keep[Promote to encounter table row<br/>"forest cult-scout patrol"<br/>so it can recur elsewhere]
    Hot[Stay as scene transcript only<br/>summarized to warm, eventually cold]

    G --> Q
    Q -- reusable archetype --> Keep
    Q -- specific to this moment --> Hot

    classDef ok fill:#dfd,stroke:#393
    classDef hot fill:#fec,stroke:#a83
    class Keep ok
    class Hot hot
```

Promotion is conservative — most scenarios are *specific* and shouldn't
recur identically. But "cult-scout patrol" as an archetype is fair game.

## See also

- The same two-layer pattern applied to entities: [`02-entity-generation-pipeline.md`](02-entity-generation-pipeline.md)
- Where travel-segment encounter rolls come from: [`../travel/01-party-movement-flow.md`](../travel/01-party-movement-flow.md)
- Director's pacing call and foreshadow queue: [`../backstage/01-director-between-scenes.md`](../backstage/01-director-between-scenes.md)
- Why the encounter table itself is authored, not generated: [`06-generation.md`](../../06-generation.md) §What gets generated
