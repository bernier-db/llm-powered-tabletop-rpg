---
title: Memory Tiers + Summarizer
status: DRAFT
summary: Hot (verbatim) → warm (session summary) → cold (vector codex) tier transitions; summarizer cadence; cold recall query path; session-end compaction. Engine memory, not NPC memory.
related: [../../08-cross-cutting.md, ../../00-overview.md, ../core-loops/03-npc-reencounter-memory.md, ../../02-tools-orchestration.md]
updated: 2026-05-17
---

# Memory Tiers + Summarizer

**Source**: [`00-overview.md`](../../00-overview.md) §Four layers, [`08-cross-cutting.md`](../../08-cross-cutting.md) §Summarizer

The DM's effective memory is layered. **Hot** is the current scene verbatim,
**warm** is the current session compressed, **cold** is everything else
retrievable via vector codex. The summarizer is what moves content from hot
to warm. Cold recall is a query, not a transition.

> This is *engine* memory (what gets injected into agent prompts). NPC
> memory is a separate, structured store — see
> [`../core-loops/03-npc-reencounter-memory.md`](../core-loops/03-npc-reencounter-memory.md).

## Conceptual view — the three tiers

```mermaid
flowchart LR
    subgraph Hot[Hot memory]
        H[Current scene<br/>last ~20 turns verbatim]
    end
    subgraph Warm[Warm memory]
        W[Session summary<br/>compressed beats: entities, decisions, rolls, emotions]
    end
    subgraph Cold[Cold memory]
        C[Codex + vector index<br/>NPCs, locations, lore, prior-session summaries]
    end

    Hot -- every K turns --> Summarizer
    Summarizer --> Warm
    Warm -- on session_end --> CompactSummarizer
    CompactSummarizer --> Cold
    Cold -- query on demand --> PromptBuilder
    Warm --> PromptBuilder
    Hot --> PromptBuilder
    PromptBuilder --> Agent[Agent prompt context]

    classDef hot fill:#fde,stroke:#a33
    classDef warm fill:#fec,stroke:#a83
    classDef cold fill:#cdf,stroke:#36a
    classDef pipe fill:#eee,stroke:#666
    class H hot
    class W warm
    class C cold
    class Summarizer,CompactSummarizer,PromptBuilder pipe
```

## Context budget layering per turn

What actually ends up in an agent's prompt every beat, in priority order
(from [`02-tools-orchestration.md`](../../02-tools-orchestration.md) §Context budgeting):

```mermaid
flowchart TB
    L1[1. System: role + tone + rules summary]
    L2[2. Session-zero state: tone, content lines, mode]
    L3[3. Director brief — only at scene start]
    L4[4. Hot: last ~20 turns verbatim]
    L5[5. Warm: current-session summary]
    L6[6. Cold recall: vector hits relevant to situation]
    L7[7. Actor sheets: only those present]
    L8[8. Tools available]

    L1 --> L2 --> L3 --> L4 --> L5 --> L6 --> L7 --> L8 --> Prompt[Assembled prompt]

    classDef tier fill:#eef,stroke:#669
    class L1,L2,L3,L4,L5,L6,L7,L8 tier
```

Higher tiers are non-negotiable; lower tiers shrink first under token
pressure. Cold recall is bounded (top-K), so the prompt size is predictable.

## Sequence — summarizer run (hot → warm)

Cadence: every K turns (likely 10–20, TBD).

```mermaid
sequenceDiagram
    autonumber
    participant T as Tool Surface
    participant Sum as Summarizer Agent<br/>(small/cheap model)
    participant S as State Store
    participant V as Vector Index

    Note over T: turn counter passes K threshold
    T->>S: get_hot_scene(window=K turns)
    S-->>T: verbatim turns
    T->>Sum: compress(turns)<br/>"preserve: entities, decisions, rolls, emotional beats"
    Sum-->>T: tight summary
    T->>S: append warm_summary chunk
    T->>S: prune hot down to last ~5 turns + new summary anchor
    Note over T: warm grows incrementally; hot stays bounded
```

The summarizer is a cheap-model job, not a DM task. Keeping it out of the DM
agent's loop keeps it isolated and testable.

## Sequence — cold recall on demand

Triggered when the DM or an agent needs context beyond the current session
(e.g., "what did Vellis say two sessions ago about the cult?").

```mermaid
sequenceDiagram
    autonumber
    participant Agent as DM / NPC / Director
    participant T as Tool Surface
    participant E as Embedder
    participant V as Vector Index
    participant S as State Store

    Agent->>T: query_codex("cult of the red sigil", k=5)
    T->>E: embed(query)
    E-->>T: query vector
    T->>V: top-K nearest by cosine
    V-->>T: codex_entry_ids
    T->>S: hydrate entries
    S-->>T: codex rows (NPC summaries, place lore, prior beats)
    T-->>Agent: ranked entries with metadata
    Note over Agent: injected into prompt under "Relevant cold recall"
```

## Session-end → cold compaction

```mermaid
sequenceDiagram
    autonumber
    participant T as Tool Surface
    participant CS as Compact Summarizer
    participant E as Embedder
    participant S as State Store
    participant V as Vector Index

    Note over T: session end signal (player saves & exits, or DM scene_break with end=true)
    T->>S: get_full_warm_summary(session_id)
    S-->>T: warm summary
    T->>CS: compact(warm) → session_chronicle
    CS-->>T: chronicle: ~1-page session summary with named entities
    T->>E: embed(chronicle) + embed(per-entity slices)
    E-->>T: vectors
    T->>S: insert codex_entry rows (one per beat / entity touched)
    T->>V: index vectors
    Note over T: next session opens with warm=empty,<br/>cold contains this session
```

## What gets preserved vs. pruned (summarizer policy)

```mermaid
flowchart LR
    In[Verbatim turn block]
    Keep[Preserve]
    Drop[Prune]

    In --> K1[Named entities introduced]
    In --> K2[Decisions the party made]
    In --> K3[Rolls + 4-degree outcomes]
    In --> K4[Emotional beats / disposition shifts]
    In --> D1[Small talk]
    In --> D2[Repeated descriptions]
    In --> D3[Action-by-action combat detail<br/>final state is in roll_log anyway]

    K1 --> Keep
    K2 --> Keep
    K3 --> Keep
    K4 --> Keep
    D1 --> Drop
    D2 --> Drop
    D3 --> Drop

    classDef keep fill:#dfd,stroke:#393
    classDef drop fill:#fde,stroke:#a33
    class K1,K2,K3,K4,Keep keep
    class D1,D2,D3,Drop drop
```

## See also

- NPC memory is a *separate* mechanism (per-NPC, structured): [`../core-loops/03-npc-reencounter-memory.md`](../core-loops/03-npc-reencounter-memory.md)
- Cost tiering for cheap-model jobs: [`08-cross-cutting.md`](../../08-cross-cutting.md) §Cost optimization
- The roll_log audit trail referenced above: [`02-tools-orchestration.md`](../../02-tools-orchestration.md) §Key invariants
- Open: cadence tuning, eval for "did the summarizer preserve the right things": [`TODO-BRAINSTORM.md`](../../TODO-BRAINSTORM.md) §Summarizer
