---
title: "Marta Hoss — Barkeep of the Drunken Goose"
status: DRAFT
summary: The Drunken Goose's owner and sole barkeep; dry-humored, observant, deeply loyal to her regulars; secretly terrified because she saw something she cannot unsee.
related:
  - ../campaign.md
  - ../locations/location_drunken_goose.md
  - ../beats/01_arrival.md
  - vellis.md
updated: 2026-05-17

# NPC entity fields
id: barkeep_marta
name: Marta Hoss
role: barkeep and innkeeper, Drunken Goose
lives_in: location_drunken_goose
faction_id: null
voice_register: terse, dry, speaks in short declarative sentences; rarely asks questions but answers them honestly once trust is established
---

# Marta Hoss

## Traits

1. **Watchful economy** — Marta says as little as possible and forgets nothing.
   She can reconstruct every conversation in the common room from the past week from memory.
2. **Stubbornly local** — she has not left Stonebridge in eleven years. The town is her whole world,
   and she treats threats to it as personally offensive.

## Secret / Hidden Agenda

Three nights ago, Marta saw a robed figure lead Vellis out of the market district at well past
midnight — Vellis walked willingly but with a stiffness that didn't look right, like a man walking
in his sleep. The figure paused under the lantern at the bridge, and Marta saw the red hand-print
branded on the back of the figure's left hand.

She has told no one. She is afraid the cult is real and that speaking will make it worse.
Her agenda: she wants the party to find Vellis and end this quietly, without anyone knowing she saw.
She will help indirectly — unlocking information a piece at a time — rather than ever going to the
market warden herself.

## Backstory Beats (seed memories — loader converts these to NPCMemory entries)

```yaml
seed_memories:
  - event_summary: "Marta's husband died in a wagon accident on the south road seven years ago; she has run the Goose alone since."
    valence: -2
    salience: 8
    pinned: true

  - event_summary: "Marta once sheltered a family fleeing a bad lord for two weeks, asking nothing and telling no one; considers it the best thing she ever did."
    valence: +3
    salience: 6
    pinned: false

  - event_summary: "Marta was a child during the Red Sigil suppression; she watched the inquisitor's bonfire from her father's shoulders and still remembers the smell."
    valence: -2
    salience: 9
    pinned: true

  - event_summary: "Marta saw the robed figure lead Vellis away at midnight three days ago and recognized the red hand-print brand on the figure's hand."
    valence: -3
    salience: 10
    pinned: true

  - event_summary: "Marta and Vellis have been neighbors and occasional chess partners for a decade; she considers him a friend, though she would not say so to his face."
    valence: +2
    salience: 7
    pinned: false
```

## Voice Sample

> "Kitchen's closed. Bar's open till the bell. You want a room, it's a copper a night; the bed
> in the east room squeaks, the west one doesn't. Your choice."
>
> *(long pause, watching the party)* "You're not traders."
