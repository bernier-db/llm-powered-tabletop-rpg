---
title: Campaign Authoring + Validation
status: DRAFT
summary: Markdown source → loader pipeline (parse, schema-validate, reference integrity, faction-clock sanity, beat graph, diversity audit) → SQLite seed + vector index. Save/load interaction.
related: [../../01-storage.md, ../../05-director.md, ../../TODO-BRAINSTORM.md, 02-entity-generation-pipeline.md]
updated: 2026-05-17
---

# Campaign Authoring + Validation

**Source**: [`01-storage.md`](../../01-storage.md), [`05-director.md`](../../05-director.md), [`TODO-BRAINSTORM.md`](../../TODO-BRAINSTORM.md) §Director & campaign authoring

A campaign is a **git repo of markdown** (the seed) that gets parsed,
validated, and loaded into a runtime SQLite DB (the state). Markdown is the
shareable, forkable, version-controlled artifact; SQLite is the mutating
play state. Updating an NPC's HP during play does *not* rewrite the markdown.

## Conceptual view — authored sources vs. runtime state

```mermaid
flowchart LR
    subgraph Source[Authored — git-tracked]
        Camp[campaigns/red_sigil/<br/>campaign.md · beats/ · factions/<br/>npcs/ · locations/ · foreshadow/<br/>encounters/ · items/]
        World[world/bible.md<br/>regions/, calendars/, cultures/]
        Rules[rules/<br/>spell list · trait pool · names grammar]
    end

    Loader[Loader<br/>parse · validate · seed]

    subgraph Runtime[Runtime — SQLite + sqlite-vec]
        SQL[(SQLite: state tables<br/>actors, scenes, locations, factions,<br/>quests, items, relationships)]
        Vec[(sqlite-vec: codex embeddings)]
        Log[(roll_log, state_log)]
    end

    Camp --> Loader
    World --> Loader
    Rules --> Loader
    Loader --> SQL
    Loader --> Vec

    SQL -. mutations during play .-> Log
    SQL -. never written back to .-> Camp

    classDef src fill:#eef,stroke:#669
    classDef pipe fill:#eee,stroke:#666
    classDef rt fill:#fff4e0,stroke:#b8862f
    class Camp,World,Rules src
    class Loader pipe
    class SQL,Vec,Log rt
```

## Validation gates — what blocks a bad campaign from loading

A markdown campaign with broken references is worse than no campaign — you
discover it mid-session. The loader is strict.

```mermaid
flowchart TB
    Start[Loader starts]
    P1[1. Parse all markdown files<br/>extract frontmatter + content]
    P2[2. Schema validation<br/>zod schemas per entity type]
    P3[3. Reference integrity<br/>every npc/location/faction id exists]
    P4[4. Faction-clock sanity<br/>segments numeric, antagonist NPCs exist]
    P5[5. Foreshadow seeds<br/>tags resolvable, payoffs reference real beats]
    P6[6. Beat graph<br/>branches connect, win/lose conditions reachable]
    P7[7. Rules slice<br/>spells in list, items typed, classes valid]
    P8[8. Diversity audit<br/>warn if NPC pool collapses to archetypes]
    Seed[Seed SQLite + embed codex entries]
    Fail[Reject load with report]

    Start --> P1 --> P2 --> P3 --> P4 --> P5 --> P6 --> P7 --> P8 --> Seed
    P2 -- fail --> Fail
    P3 -- fail --> Fail
    P4 -- fail --> Fail
    P5 -- fail --> Fail
    P6 -- fail --> Fail
    P7 -- fail --> Fail
    P8 -- warn only --> Seed

    classDef ok fill:#dfd,stroke:#393
    classDef fail fill:#fde,stroke:#a33
    classDef step fill:#eef,stroke:#669
    class Seed ok
    class Fail fail
    class P1,P2,P3,P4,P5,P6,P7,P8 step
```

Steps 2–7 are **blocking**; step 8 (diversity audit) is a warning so you can
intentionally ship a same-archetype campaign if that's the design.

## Sequence — campaign load

```mermaid
sequenceDiagram
    autonumber
    actor U as User (CLI: "load campaigns/red_sigil")
    participant L as Loader
    participant FS as Markdown files
    participant Z as zod schemas
    participant E as Embedder
    participant S as SQLite
    participant V as Vector Index

    U->>L: load(path)
    L->>FS: read campaign.md + walk subdirs
    FS-->>L: file tree + raw content

    loop per file
        L->>L: parse frontmatter + body
        L->>Z: validate(entity_type, parsed)
        Z-->>L: typed entity OR error
    end

    L->>L: build ref graph<br/>(npc.lives_in → location.id, etc.)
    L->>L: integrity check (steps 3–7)
    alt any error
        L-->>U: load failed: report w/ file:line
    else clean
        L->>S: BEGIN transaction
        L->>S: insert regions, settlements, locations
        L->>S: insert npcs (+ 3–5 seed memories per NPC)
        L->>S: insert factions, faction_clocks, quests
        L->>S: insert beats, branches, foreshadow_seeds
        L->>S: insert items, encounter tables
        L->>E: embed every codex-bound entity (one batch call)
        E-->>L: vectors
        L->>V: index
        L->>S: COMMIT
        L-->>U: campaign ready
    end
```

## Markdown structure (sketch — to be detailed)

The current sketch from [`TODO-BRAINSTORM.md`](../../TODO-BRAINSTORM.md) §Director & campaign authoring:

```mermaid
flowchart TB
    Camp[campaigns/red_sigil/]
    Camp --> CampMD[campaign.md<br/>frontmatter: title, tone, lethality, est_sessions]
    Camp --> Beats[beats/<br/>one .md per major beat<br/>frontmatter: id, dependencies, branches]
    Camp --> NPCs[npcs/<br/>one .md per named NPC<br/>frontmatter: name, role, voice, secret, drives, lines]
    Camp --> Locs[locations/<br/>nested by region/settlement]
    Camp --> Facs[factions/<br/>frontmatter: clock_segments, goal, members]
    Camp --> FS[foreshadow/<br/>one .md per seed<br/>frontmatter: context_tags, pays_off_at_beat]
    Camp --> Encs[encounters/<br/>per region/situation tables]
    Camp --> Items[items/<br/>tiered: mundane/flavorful/narrative]

    classDef dir fill:#eef,stroke:#669
    classDef file fill:#fff,stroke:#999
    class Camp dir
    class CampMD,Beats,NPCs,Locs,Facs,FS,Encs,Items file
```

## Save / load interaction

Saves are copies of the runtime SQLite. The markdown is never modified.
Loading a save = open that SQLite file; loading a campaign = run this
pipeline to seed a fresh one.

```mermaid
flowchart LR
    Camp[campaigns/red_sigil/<br/>markdown - immutable]
    Fresh[Fresh start<br/>run loader pipeline]
    NewDB[(new SQLite save<br/>save_001.db)]
    SaveN[(save_017.db<br/>existing save)]
    Branch[Branch<br/>copy file]
    BranchDB[(save_017_branch.db)]

    Camp --> Fresh --> NewDB
    SaveN -. open directly .-> Runtime[Runtime]
    NewDB --> Runtime
    SaveN --> Branch --> BranchDB --> Runtime

    classDef src fill:#eef,stroke:#669
    classDef db fill:#fff4e0,stroke:#b8862f
    classDef rt fill:#dfd,stroke:#393
    class Camp src
    class NewDB,SaveN,BranchDB db
    class Runtime rt
```

## See also

- Why markdown + SQLite + vector split, not one of them: [`01-storage.md`](../../01-storage.md)
- What gets generated *during* play vs. authored upfront: [`02-entity-generation-pipeline.md`](02-entity-generation-pipeline.md)
- Foreshadow seed usage: [`../backstage/01-director-between-scenes.md`](../backstage/01-director-between-scenes.md)
- Save bundle format still open: [`08-cross-cutting.md`](../../08-cross-cutting.md) §Save/load
