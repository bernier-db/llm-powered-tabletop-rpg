---
title: World & NPC Generation Pipeline
status: AGREED
summary: Two-layer pattern (procedural skeleton + LLM canon-aware expansion + canon commit) with anti-archetype counter-measures and reusable contract.
related: [00-overview.md, 01-storage.md, 04-npc-memory.md, 07-geography.md, 10-campaign-design.md, 11-dm-styles-tones.md]
updated: 2026-05-17
---

# World & NPC Generation Pipeline

> Pattern is AGREED. Per-entity tables (40-trait pool, tension tables, naming grammars) are DRAFT.

The core tension: LLMs write evocative content, but they hallucinate, drift toward archetypes, and contradict prior canon. The pattern below is the discipline that solves all three.

## What gets generated

Different domains need different pipelines and cadences:
- **Regions** — usually authored upfront
- **Settlements** — mix of authored (key ones) + JIT (the unplanned detour)
- **Locations within settlements** — the specific tavern, temple, shop, mansion
- **Sub-locations** — rooms within buildings, encounter sites within wilderness
- **Dungeons / adventure sites** — multi-room graphs with internal structure
- **NPCs** — named characters (vs "a guard" = stat-block fluff)
- **Items** — tiered (mundane / flavorful mundane / narrative)
- **Encounters** — combat or non-combat tension events
- **Factions** — almost always authored; generating them on the fly produces meaningless orgs

## Cadence (when to generate)

- **Upfront** (campaign setup): 3–6 major regions, 5–10 key NPCs, core factions, pivotal locations. Authored or LLM-assisted-then-human-reviewed.
- **Just-in-time** (on arrival): the workhorse — settlements/locations the party detours into. Generated on entry, committed to canon, exists permanently after.
- **Lazy** (only on engagement): NPCs not spoken to, rooms not opened. Hold placeholders; expand only when player interaction forces it.

**Discipline**: generate the thinnest layer that lets you narrate the current moment; expand the next layer only when the player engages.

## The two-layer pattern (every entity goes through this)

### 1. Procedural skeleton (no LLM)
Weighted table rolls produce structural facts. Example for a settlement:

```
size:        d% → hamlet | village | town | city   (weighted by region density)
industry:    pick 1 from region-appropriate list   (mining inland, fishing coastal)
government:  d6 → lord | council | theocracy | …
wealth:      d6 → poor | modest | prosperous | wealthy
notable:     pick 1-2 from a table of 40+
disposition_baseline: d6 → hostile | suspicious | neutral | welcoming
culture:     inherited from region
tension:     pick 1 from a tension table
```

Cheap, fast, varied. The LLM never sees this step — it receives the result.

### 2. Canon query + LLM expansion
Before the LLM runs, a **retrieval pass** pulls existing canon:
- Parent context (region's culture, threats, recent events)
- Sibling entities (nearby settlements for rivalries, trade)
- Factions present in the region
- Existing NPC names in the area (to avoid duplicates)
- Recent party context (so generated content can resonate)
- Variety state (what's been overused)

Then the LLM gets a tightly-scoped prompt with the skeleton + retrieved canon + constraints.

### 3. Canon commit
Output is parsed, validated, written to SQLite, embedded into the vector codex.
**Entity is now permanent.** Future lookups return the stored version. The LLM never regenerates what already exists.

## Per-entity notes

- **Settlements**: pattern above.
- **NPCs**: skeleton picks 2 distinct traits from a ~40-trait pool, non-overlapping with NPCs already in the same settlement. **Voice register** locked at generation. **Speech sample** generated and stored as exemplar for future invocations. 3–5 backstory beats seed the memory bank (see [`04-npc-memory.md`](04-npc-memory.md)). **Every named NPC gets a secret/hidden agenda rolled from a separate table** — this is what makes them interesting rather than functional.
- **Dungeons**: procedural room graph (LLM is bad at maps), narrative beats placed (2–3 discoveries, 2–3 obstacles, 1 climax), LLM does a single batch dressing pass for tone consistency.
- **Encounters**: region encounter table for type/threat + LLM dressing for *why* and texture.
- **Items**: tiered:
  - *Mundane* — tables only, no LLM
  - *Flavorful mundane* — light pass (locket with a name, half-burned letter)
  - *Magical/narrative* — full pass with **provenance** (who made it, why, what it cost)

## Anti-archetype counter-measures (LLMs collapse to the mean)

- **Anti-example prompts** — "Do NOT make them gruff/grizzled/friendly/talkative — overrepresented in this region."
- **Trait pools with usage tracking** — weighted exclusion vs. recently-used traits.
- **Naming grammars per culture** — syllable patterns/roots cluster names culturally without repetition.
- **Diverse-source seeding** — "alchemist / scholar / witch / hermit / scribe / hedge-mage / court astrologer" instead of "magic-user"; same role, eight vocabularies.
- **Settlement-level diversity vector** — track personality-axis coverage per settlement; bias new generation toward unfilled axes.

## Canon preservation rule (single most important)

> **Every generation prompt starts with a retrieval pass from the codex.**

The LLM doesn't "remember" the world. It re-derives it from the codex on each call. This is the only thing that prevents long-campaign contradictions. Skip this and by session 8 the river that was east of Blackmoor will be west, the bartender will have a new name, and the cult symbol will mean something different.

## Reusable generation contract

```ts
GenerationRequest<T> = {
  parent: EntityRef,
  constraints: { mustInclude?, mustExclude?, themeHints?, toneOverride? },
  canonSnapshot: CodexEntry[],          // pre-retrieved relevant entries
  varietyState: { traitsUsed, namesUsed, archetypesUsed },
}
GenerationResult<T> = {
  entity: T,
  committedId: string,                  // canon-committed
  followUpHooks: GenerationHook[],      // "NPC mentioned brother — gen if asked"
}
```

## Cost / latency

- Settlement: ~1 call, 1–3K out tokens, fits "loading…" beat at scene transition
- NPC: ~500 tokens
- Dungeon: 5–10K tokens in one batched call (more coherent + cheaper than per-room)
- Lever: **speculative pre-generation** during quiet narrative beats; cache-invalidate if party takes a different path

## Open

- Concrete tables (40-trait pool, tension tables, naming grammars) — to be authored
- Image generation for NPCs/locations on first appearance — see [`09-multimodality.md`](09-multimodality.md)
