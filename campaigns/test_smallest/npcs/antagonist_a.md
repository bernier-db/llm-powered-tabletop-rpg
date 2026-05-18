---
title: "Antagonist A — Cult Cell Leader (STUB)"
status: DRAFT
summary: Minimal stub NPC for reference-integrity validation; the cult's on-the-ground cell leader in the Greyhill region; full characterization deferred.
related:
  - ../factions/cult_of_red_sigil.md
updated: 2026-05-17

# NPC entity fields
id: antagonist_a
name: "[Unnamed — generated on reveal]"    # TBD: pending design — name generated JIT at moment of reveal
role: cult cell leader, Greyhill region
lives_in: null    # TBD: lair location not yet authored
faction_id: cult_of_red_sigil
voice_register: null    # TBD: generated at reveal
---

# Antagonist A (Stub)

This NPC exists as a reference-integrity anchor for `cult_of_red_sigil.md`.
Full characterization (traits, secret, backstory beats, voice sample) is deferred until
the campaign is expanded beyond the v0.1 test fixture.

## Minimum viable fields for loader

- `id: antagonist_a` — resolves the `members` reference in `cult_of_red_sigil.md`
- `faction_id: cult_of_red_sigil` — bidirectional membership link
- All other characterization fields: null or deferred

## Notes

The DM agent should treat this NPC as a JIT-generate target: when the party's investigation
reaches the point where this character would appear, the generation pipeline expands this stub
into a full NPC, commits to canon, and this file is superseded by the committed SQLite entry.

# TBD: pending design — stub NPC lifecycle: how does the loader distinguish "intentional stub"
# from "accidentally incomplete NPC"? Suggest a stub: true flag in frontmatter.
stub: true
