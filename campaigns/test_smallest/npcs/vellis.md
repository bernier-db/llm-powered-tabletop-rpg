---
title: "Vellis — Merchant of Stonebridge"
status: DRAFT
summary: A cautious cloth-and-spice merchant who was recruited (under duress) by the cult; currently missing; the scenario's primary missing-person subject.
related:
  - ../campaign.md
  - ../locations/location_market_district.md
  - ../factions/cult_of_red_sigil.md
  - barkeep_marta.md
updated: 2026-05-17

# NPC entity fields
id: vellis
name: Vellis (family name unknown — goes by one name as is local custom for merchants)
role: cloth-and-spice merchant; stall holder at Stonebridge market
lives_in: location_market_district
faction_id: cult_of_red_sigil    # recruited under coercion; not a true believer
voice_register: precise and careful; uses the vocabulary of a man who weighs words like he weighs goods; slightly formal, slightly nervous
---

# Vellis

## Traits

1. **Ledger-minded** — Vellis tracks everything in writing. He cannot help himself.
   Even under cult coercion he kept a second, coded ledger — the one that is now missing with him.
   This coded ledger is the investigation's key physical artifact.
2. **Debt-haunted** — a bad trade two years ago left him quietly indebted to a lender
   connected (unknowingly to Vellis) to the cult's outer circle. That debt is how they got him.

## Secret / Hidden Agenda

Vellis does not believe in the cult's theology. He was coerced via his debt and has been
providing the cult with access to the market's delivery schedule — so cult members can move
goods in and out of town under cover of legitimate trade wagons.

His agenda, if rescued: he wants to pay his debt through testimony and will cooperate fully
with anyone who can make the debt go away and keep his name out of the market warden's report.
The coded ledger in his possession is detailed enough to identify Antagonist A's operation.

## Backstory Beats (seed memories — loader converts these to NPCMemory entries)

```yaml
seed_memories:
  - event_summary: "Vellis arrived in Stonebridge twelve years ago from the lowland city; no one knows why he left and he has never said."
    valence: -1
    salience: 5
    pinned: false

  - event_summary: "Two years ago, a single bad shipment of silk (spoiled by river water) wiped out a year's profit and forced Vellis to borrow at poor terms."
    valence: -3
    salience: 8
    pinned: true

  - event_summary: "Vellis taught himself the market's regional cipher for coded pricing; he uses it for his private ledger, believing no one in Stonebridge can read it."
    valence: +1
    salience: 6
    pinned: false

  - event_summary: "A cult intermediary approached Vellis about his debt three weeks ago; Vellis initially refused, then agreed after being shown what the lender could do to his stall license."
    valence: -3
    salience: 10
    pinned: true

  - event_summary: "Vellis and Marta have played chess on quiet evenings for a decade; he has lost more games than he has won and considers her the sharpest person in Stonebridge."
    valence: +2
    salience: 5
    pinned: false
```

## Voice Sample

> "That price includes transport to the east gate. Beyond that gate, the goods are yours and
> the road is yours. I do not make promises about roads."
>
> *(if pressed on something uncomfortable)* "I would need to check the ledger on that.
> I don't — I don't carry figures in my head. Give me a moment."
