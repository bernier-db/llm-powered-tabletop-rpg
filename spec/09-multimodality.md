---
title: Multimodality — TTS, STT, Image Generation
status: OPEN
summary: STUB — Per-NPC voice profiles, image consistency across re-renders, asset storage, latency budgets, vendor abstraction. Architectural implications, not just features.
related: [06-generation.md, 08-cross-cutting.md, TODO-BRAINSTORM.md, OPEN-QUESTIONS.md]
updated: 2026-05-17
---

# Multimodality — TTS, STT, Image Generation

> ⚠️ **STUB** — question set laid out; design not yet started.

Promoted from the parking lot to a first-class design topic because it has real architectural implications, not just feature additions.

## Why this isn't just "wire up a TTS API"

Each modality interacts with the engine in non-trivial ways:

### Text-to-speech (TTS)
- **Per-NPC voice profiles** — every named NPC gets a voice assigned at generation time (probably a `voice_id` field on the Actor with vendor mapping). Voices should match the character (warrior baritone vs. child's pitch vs. raspy elder).
- **Narration voice vs. character voices** — the DM has one voice; each NPC has theirs. Engine needs to route per-line.
- **Latency** — streaming TTS is essential; a full sentence-then-speak loop ruins pacing. The engine needs to emit chunks as the LLM streams.
- **Cost** — TTS per token is significant at scale. Cache common phrases? Skip for incidental NPCs?
- **Player toggle** — must be cheap to enable/disable mid-session.

### Speech-to-text (STT)
- **Turn-taking detection** — how does the engine know the player is done speaking? Silence threshold? Push-to-talk?
- **Free-form vs. voice commands** — both have a place ("I attack the orc" vs. "/inventory"). Engine should accept either.
- **Multiplayer voice** — speaker identification (who said what), per-player audio channels.
- **Accessibility** — STT is a primary input for some players, not a nice-to-have.

### Image generation
- **When to generate** — NPC first appearance? Location first visit? On explicit player request ("show me this NPC")? Probably a mix: auto for major beats, on-demand for everything else.
- **Consistency across re-renders** — the same NPC should look the same every time. Options: store a reference image + use as conditioning; store a canonical prompt; use a character-LoRA per major NPC. **Hard problem.**
- **Style consistency** — whole campaign should have a unified visual style. Style guide in session zero?
- **Storage** — images are big. Local file store + blob references in DB? CDN? Cleanup policy?
- **Vendor mapping** — Anthropic doesn't currently offer image gen; need to integrate an external provider (Replicate / Stability / Recraft / etc.). Abstract behind an interface so vendors can swap.
- **Latency** — image gen is slow (seconds to tens of seconds). Don't block the narrative; render in background and surface when ready.
- **Cost** — per-image cost adds up fast. Budget controls?

### Cross-cutting questions
- **Asset storage strategy** — blob storage layout, embedding generation for retrieval (visual codex search?), versioning
- **Sync vs. async** — text streams immediately; voice streams; images come later. UI needs to handle out-of-order rendering.
- **Budget caps** — per-session cost ceiling that gracefully degrades (drop image gen, then TTS, then keep text)
- **Offline / degraded modes** — engine must work text-only when modalities fail or are disabled

## What to design before building

1. The `voice_profile` and `image_profile` fields on Actor/Location
2. The asset-storage layout (where do generated images and audio live?)
3. The streaming protocol between engine and UI (text chunks, audio chunks, image-ready events)
4. The vendor abstraction layer
5. The session-zero modality preferences
6. Cost-budget enforcement strategy

## Open questions

- Which TTS vendor? (ElevenLabs, OpenAI TTS, Cartesia, local Coqui/Piper?)
- Which image-gen vendor and consistency strategy? (Reference-image conditioning, LoRA per NPC, canonical prompt + seed)
- How does this affect the agent-prompt design? (Does the DM agent know it's being voiced? Does it write differently?)
- Multimodal *input* — can players upload an image to show the DM something? Drop a sketch of "what my character looks like"?

## Cross-references

- Per-NPC voice profile is set during NPC generation — see [`06-generation.md`](06-generation.md)
- Cost budget interacts with the model-mix strategy — see [`08-cross-cutting.md`](08-cross-cutting.md)
- Image consistency interacts with canon preservation — see [`06-generation.md`](06-generation.md)
