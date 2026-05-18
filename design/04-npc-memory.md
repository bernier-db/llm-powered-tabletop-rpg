---
title: NPC Memory Model
status: AGREED
summary: How NPCs structurally remember party interactions — valence/salience entries, decay, pinning, and disposition computation on re-encounter.
related: [00-overview.md, 01-storage.md, 06-generation.md, 10-campaign-design.md]
updated: 2026-05-17
---

# NPC Memory Model

> Model is AGREED. Decay tuning and salience scoring are still OPEN.

The technical "memory" the LLM doesn't actually have — what makes NPCs *remember* the party.

## Schema

```ts
NPCMemory = {
  id, npc_id,
  event_summary: string,        // short, one-line preferred
  valence: -3..+3,              // emotional weight
  salience: 1..10,              // how important to this NPC
  recall_strength: float,       // current strength after decay
  related_actor_ids: string[],  // who was involved
  pinned: boolean,              // exempt from decay
  ts: timestamp,                // world time it was written
}
```

## Write path

When a PC interacts with an NPC, the engine writes one short memory entry from that NPC's POV:
- `commit_npc_memory(npc_id, summary, valence, salience, related_actor_ids)`
- Embedding generated and stored alongside for vector recall
- Salience computed by the DM agent based on the event's significance

## Read path (on NPC re-encounter)

1. Retrieve top-K memories by `salience × recency_decay × relevance_to_present_actors`
2. Compute current disposition = `base_disposition + Σ(valence-weighted memories)`
3. Inject into the NPC actor's prompt before they speak:
   ```
   What you remember about the party:
   - [memory 1]
   - [memory 2]
   ...
   Your current disposition toward each PC:
   - Alice: -2 (suspicious — she haggled you down on the silk)
   - Bob: +3 (grateful — he paid full price + tipped well)
   ```

## Decay

- Trivial memories fade with time + interaction count
- Major memories (betrayals, life-saving, oath-breaking) get **pinned** — never decay
- Pinning is set at write-time by the DM based on intensity; can be manually adjusted

## Why this works

The bartender you tipped well in session 1 *actually* greets you warmly in session 12 — without the DM needing to remember it — because the lookup is structural. The LLM doesn't remember; the system remembers, then tells the LLM.

## Generation seed

When an NPC is generated (see [`06-generation.md`](06-generation.md)), 3–5 backstory beats become initial memory entries with appropriate decay weights. New NPCs have texture from turn one.

## Cross-NPC memory

Open question: do NPCs share memories within a faction? ("The guild knows you stiffed Vellis.") Likely yes for tightly-knit factions; mediated by a `faction_intel` propagation step in the Director loop. **DEFERRED**.
