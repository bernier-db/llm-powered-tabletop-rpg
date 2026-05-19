---
title: Director — Between-Scenes Planner
status: DRAFT
summary: Director inputs (clocks, foreshadow queue, spotlight, warm summary) and outputs (scene brief, faction ticks, planted seeds). When the Director runs and what it never does.
related: [../../05-director.md, ../party-shapes/01-solo-ai-companion.md, ../travel/01-party-movement-flow.md, ../generation/01-campaign-authoring-validation.md]
updated: 2026-05-17
---

# Director — Between-Scenes Planner

**Source**: [`05-director.md`](../../05-director.md)

The Director is *not* a narrator. It's the stage manager: it never speaks to
the player, it runs only between scenes (and after big time advances), and
its only output is a short **scene brief** that the DM agent reads at scene
start.

## Conceptual view — inputs and outputs

```mermaid
flowchart LR
    subgraph Inputs[Director inputs]
        Camp[(Campaign skeleton<br/>beats · branches · win/lose)]
        FC[(Faction clocks<br/>segmented progress per antagonist)]
        Sched[(Off-screen NPC schedule<br/>last-seen, intent)]
        FS[(Foreshadow queue<br/>seeds w/ context tags)]
        ST[(Spotlight tracker<br/>scenes-central per PC)]
        Warm[(Warm summary<br/>recent session compressed)]
    end

    Dir[[Director Agent<br/>runs between scenes]]

    subgraph Outputs[Director outputs → next scene]
        Brief[Scene brief<br/>pressure · pacing call · spotlight nudge]
        Plant[Foreshadow plant<br/>1–2 seeds matching location/situation]
        Tick[Faction tick<br/>+1 segment + visible evidence]
        NPCMove[NPC movement<br/>who's about to intersect party]
    end

    Camp --> Dir
    FC --> Dir
    Sched --> Dir
    FS --> Dir
    ST --> Dir
    Warm --> Dir
    Dir --> Brief
    Dir --> Plant
    Dir --> Tick
    Dir --> NPCMove

    Brief -. read at scene start .-> DM[DM Agent]

    classDef store fill:#fff4e0,stroke:#b8862f
    classDef agent fill:#e8f0ff,stroke:#4a6fa5
    classDef out fill:#dfd,stroke:#393
    class Camp,FC,Sched,FS,ST,Warm store
    class Dir,DM agent
    class Brief,Plant,Tick,NPCMove out
```

## When the Director runs

```mermaid
stateDiagram-v2
    [*] --> SceneActive
    SceneActive: Scene in play (DM/Combat holds floor)
    DirRun: Director runs (offline)
    SceneNext: Next scene loads w/ brief

    SceneActive --> DirRun: scene_break signal<br/>or big time advance (travel)
    DirRun --> SceneNext: scene brief written
    SceneNext --> SceneActive: DM opens scene, reads brief
```

The Director **never** runs mid-scene. Its cadence is deliberately
in-between: it gets all the time it needs (no player waiting on a streamed
reply), can spend tokens on careful planning, and doesn't risk breaking
narrative flow.

## Sequence — scene_break → Director run → next scene

```mermaid
sequenceDiagram
    autonumber
    participant DM as DM Agent
    participant T as Tool Surface
    participant Dir as Director Agent
    participant S as State Store

    DM->>T: scene_break(reason="party rests at inn")
    T->>S: close current scene, flush hot→warm summary
    T->>Dir: trigger run(scene_break_context)

    Dir->>T: get_campaign_skeleton + get_faction_clocks
    Dir->>T: get_recent_scenes (warm summary) + get_spotlight_tracker
    Dir->>T: peek_foreshadow_queue + get_npc_schedule
    T-->>Dir: full backstage payload

    Note over Dir: Plan:<br/>which clocks tick this break?<br/>which seed to plant?<br/>who needs spotlight?<br/>any NPC about to intersect?

    par parallel commits
        Dir->>T: advance_faction_clock(faction_id="cult", +1, evidence="dead crow on the road")
        Dir->>T: queue_foreshadow(seed_id="cult_symbol", priority=high)
        Dir->>T: nudge_spotlight(pc_id="alice", reason="background underused 3 scenes")
    end

    Dir->>T: next_scene(brief={ pressure, pacing, spotlight, planted_seeds, npc_intersect })
    T->>S: write scene_brief row
    T-->>DM: scene ready, brief attached
    DM->>T: get_scene_brief(scene_id=current)
    Note over DM: reads brief before first narration token
```

## What the scene brief actually contains

```mermaid
classDiagram
    class SceneBrief {
        scene_id
        pressure: "what is visibly different since last look"
        pacing_call: "escalate" | "breather" | "hold"
        spotlight_nudge: pc_id + reason
        planted_seeds: ForeshadowSeed[]
        npc_intersections: NPCEntry[]
        faction_evidence: string[]
        fail_forward_hooks: string[]
    }
    class ForeshadowSeed {
        seed_id
        context_tags
        suggested_placement
    }
    class NPCEntry {
        npc_id
        approach_timing
        purpose
    }
    SceneBrief --> ForeshadowSeed
    SceneBrief --> NPCEntry
```

## The "best DM practices" scaffolds (Director-owned, not DM-owned)

```mermaid
flowchart TB
    Dir[Director]
    FF[Fail-forward<br/>failed rolls advance sideways]
    Spot[Spotlight tracker<br/>+1 per scene central]
    Clocks[Faction clocks<br/>tick on inaction]
    FSeeds[Foreshadowing queue<br/>2–3 seeds ahead of reveals]
    SZ[Session-zero state<br/>tone · content lines · pacing]

    Dir --> FF
    Dir --> Spot
    Dir --> Clocks
    Dir --> FSeeds
    Dir --> SZ

    FF -. "fail, but..." prompts .-> RE[Rules Engine outcomes]
    Spot -. consulted by .-> AG[Companion Autonomy Gate]
    Clocks -. visible evidence injected .-> Brief[Scene brief]
    FSeeds -. seed picked per context .-> Brief
    SZ -. read at every scene by every agent .-> All[All agents]

    classDef agent fill:#e8f0ff,stroke:#4a6fa5
    classDef scaffold fill:#eef,stroke:#669
    classDef sink fill:#fff4e0,stroke:#b8862f
    class Dir,All agent
    class FF,Spot,Clocks,FSeeds,SZ scaffold
    class RE,AG,Brief sink
```

These are deliberately *not* in the DM prompt. Putting them in the Director
keeps the DM lean and focused on the current moment; the Director carries
the campaign-wide discipline.

## What the Director does NOT do

- Speak to the player (ever)
- Intervene mid-scene
- Override player choice (it nudges; it does not force)
- Touch the rules engine (no rolls — that's the per-actor turn loop's job)

## See also

- The five scaffolds in prose: [`05-director.md`](../../05-director.md) §"Best DM practices" scaffolds
- The spotlight tracker feeding Companion autonomy: [`../party-shapes/01-solo-ai-companion.md`](../party-shapes/01-solo-ai-companion.md)
- Travel-time Director hook: [`../travel/01-party-movement-flow.md`](../travel/01-party-movement-flow.md)
- Campaign authoring format (where faction clocks and foreshadow seeds are defined): [`../generation/01-campaign-authoring-validation.md`](../generation/01-campaign-authoring-validation.md)
