---
title: NPC Re-encounter — Memory + Disposition Recall
status: DRAFT
summary: How an NPC pulls memories, computes disposition, and assembles its prompt before speaking. Includes write path (commit_npc_memory) and decay/pinning flowchart.
related: [../../04-npc-memory.md, 01-solo-free-play.md, ../generation/02-entity-generation-pipeline.md, ../backstage/02-memory-tiers-summarizer.md]
updated: 2026-05-17
---

# NPC Re-encounter — Memory + Disposition Recall

**Source**: [`04-npc-memory.md`](../../04-npc-memory.md)

The bartender remembers you tipped well in session 1 and greets you warmly in
session 12 — without the DM holding it in context. The lookup is *structural*:
the system remembers, then tells the LLM.

## Conceptual view — memory layers feeding the NPC

```mermaid
flowchart TB
    subgraph Stores[Persistent memory for this NPC]
        Mem[(npc_memories table<br/>summary · valence · salience<br/>recall_strength · pinned · ts)]
        Emb[(sqlite-vec embeddings<br/>per memory)]
        Disp[(disposition state<br/>base + accumulated valence)]
        Voice[Voice exemplar<br/>speech sample from generation]
        Secret[Hidden agenda<br/>from generation table]
    end

    subgraph Retrieval[Read path]
        R1[salience × recency_decay × relevance_to_present_actors]
        R2[top-K memory selection]
        R3[disposition compute<br/>base + Σ valence-weighted]
    end

    PromptBuilder[NPC prompt builder]
    NPC[NPC Actor Agent]

    Mem --> R1
    Emb --> R1
    R1 --> R2
    R2 --> PromptBuilder
    Disp --> R3
    R3 --> PromptBuilder
    Voice --> PromptBuilder
    Secret --> PromptBuilder

    PromptBuilder -- "What you remember about the party:<br/>Your disposition toward each PC:<br/>Your voice exemplar:<br/>Your private agenda:" --> NPC

    classDef store fill:#fff4e0,stroke:#b8862f
    classDef pipe fill:#eef,stroke:#669
    classDef agent fill:#e8f0ff,stroke:#4a6fa5
    class Mem,Emb,Disp,Voice,Secret store
    class R1,R2,R3,PromptBuilder pipe
    class NPC agent
```

## Sequence — "the party walks into Vellis's shop again"

The re-encounter trigger fires the moment the NPC is about to take a speaking
turn (or proactively appear in narration), not when the location loads.

```mermaid
sequenceDiagram
    autonumber
    participant DM as DM Agent
    participant T as Tool Surface
    participant V as Vector Index
    participant S as State Store
    participant PB as NPC Prompt Builder
    participant N as NPC Agent (Vellis)

    DM->>T: defer_to(npc_id="vellis")
    T->>S: get_actor(vellis) + get_npc_metadata
    S-->>T: sheet, voice exemplar, secret, base_disposition

    T->>V: query_memories(npc_id=vellis, vec=embed(current_scene + present_actors))
    V-->>T: candidate memory ids by semantic relevance

    T->>S: get_npc_memories(ids, related_to=[party])
    S-->>T: memories with salience, valence, recall_strength, pinned

    Note over T: rank = salience × recency_decay × relevance<br/>filter: top-K, pinned always included

    T->>T: disposition = base + Σ(valence × recall_strength) per PC
    T->>PB: assemble payload<br/>{ memories[], disposition_per_pc, voice, secret }
    PB-->>N: prompt with memory injection + voice register

    N->>N: pick stance (greet warmly / coldly / withhold / lie)
    N-->>DM: dialogue + intent { reveal | withhold | demand | offer }

    DM->>T: framing + any consequences
```

## Write path — what gets committed after the encounter

Memories are written from the NPC's POV, with the DM scoring salience based on
how significant the moment was for *that NPC*.

```mermaid
sequenceDiagram
    autonumber
    participant DM as DM Agent
    participant T as Tool Surface
    participant E as Embedder
    participant V as Vector Index
    participant S as State Store

    Note over DM: Scene closes with a memorable beat<br/>(party paid full price + tipped)

    DM->>T: commit_npc_memory(<br/>  npc_id=vellis,<br/>  summary="Party paid full + tipped on silk",<br/>  valence=+2, salience=4,<br/>  related_actor_ids=[bob],<br/>  pinned=false)
    T->>E: embed(summary + context)
    E-->>T: vector
    T->>V: index(memory_id, vector)
    T->>S: insert npc_memories row
    Note over T: write-through; LLM never touches storage
```

## Decay & pinning

```mermaid
flowchart LR
    A[Memory written<br/>recall_strength = 1.0<br/>pinned: bool]
    B{pinned?}
    C[Apply decay<br/>per game-day or per N interactions]
    D[recall_strength → 0<br/>pruned from top-K]
    E[Persists at full strength<br/>betrayal, life-save, oath-break]

    A --> B
    B -- no --> C
    B -- yes --> E
    C --> C
    C -- below threshold --> D

    classDef warn fill:#fde,stroke:#a33
    classDef good fill:#dfd,stroke:#393
    class D warn
    class E good
```

Pinning is set at write-time by the DM based on event intensity. The Director
can also manually pin/unpin during between-scene runs if a memory turns out to
be more (or less) important than first scored.

## Cross-NPC memory (deferred)

Faction-wide propagation (`"the guild knows you stiffed Vellis"`) would happen
in the Director loop, not the per-NPC read path. See [`04-npc-memory.md`](../../04-npc-memory.md) §Cross-NPC memory.

## See also

- Where the initial 3–5 memory entries come from: [`generation/02-entity-generation-pipeline.md`](../generation/02-entity-generation-pipeline.md)
- Why the NPC sees redacted state: [`02-tools-orchestration.md`](../../02-tools-orchestration.md) §Agent permissioning matrix
- Hot/warm/cold scene memory (separate from NPC memory): [`../backstage/02-memory-tiers-summarizer.md`](../backstage/02-memory-tiers-summarizer.md)
