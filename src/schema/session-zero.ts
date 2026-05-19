// src/schema/session-zero.ts
// Cross-ref: spec/08-cross-cutting.md §Session zero
//            spec/14-glossary.md §Session Zero, §Tone, §Lethality, §Content Lines, §Veil
//            spec/13-risks-tripwires.md §14 (session-zero state read by every agent at every scene)
//            spec/11-dm-styles-tones.md §3 Tonal registers, §5 Safety / consent tooling
//
// Session zero is a one-time setup step at campaign start. The resulting config is
// persisted and injected into every agent prompt at layer 2 (below system prompt,
// above everything else) — see spec/02-tools-orchestration.md §Context budgeting.
import { z } from 'zod';
import { ToneSchema, LethalitySchema, PacingSchema, CombatGranularitySchema } from './common.js';

// ---------------------------------------------------------------------------
// ContentLine — a hard limit set in session zero
// Cross-ref: spec/14-glossary.md §Content Lines
// "Hard limits set in session zero — topics or content types that will never appear"
// Distinct from veils (which may appear off-screen).
// ---------------------------------------------------------------------------
export const ContentLineSchema = z.object({
  topic: z.string().min(1), // e.g. "graphic torture", "child endangerment"
  // TBD: enforcement mode once content-line enforcement design is settled
  // Cross-ref: spec/08-cross-cutting.md §Session zero §Open (how content lines are enforced)
}).strict();
export type ContentLine = z.infer<typeof ContentLineSchema>;

// ---------------------------------------------------------------------------
// Veil — content that may appear but always happens off-screen
// Cross-ref: spec/14-glossary.md §Veil
// ---------------------------------------------------------------------------
export const VeilSchema = z.object({
  topic: z.string().min(1), // e.g. "sexual content", "detailed drug use"
  // TBD: "fade to black" implementation (generate consequence, not the scene itself)
}).strict();
export type Veil = z.infer<typeof VeilSchema>;

// ---------------------------------------------------------------------------
// SessionZero — the full session-zero configuration record
// Cross-ref: spec/08-cross-cutting.md §Session zero (explicit field list)
//            campaigns/test_smallest/campaign.yaml (concrete authored example)
//
// Every agent reads this at every scene — tripwire #14. It is layer 2 in the
// context budget (spec/02-tools-orchestration.md §Context budgeting).
// ---------------------------------------------------------------------------
export const SessionZeroSchema = z.object({
  // Which campaign this config belongs to
  campaign_id: z.string().min(1),

  // Tone — overall flavor of the campaign
  // Cross-ref: spec/14-glossary.md §Tone; spec/11-dm-styles-tones.md §3
  tone: ToneSchema,

  // Hard content limits — these topics never appear
  content_lines: z.array(ContentLineSchema),

  // Veils — appear but fade to black
  veils: z.array(VeilSchema),

  // How dangerous the campaign is for PCs
  // Cross-ref: spec/14-glossary.md §Lethality
  lethality: LethalitySchema,

  // Narrative pacing preference
  // Cross-ref: spec/08-cross-cutting.md §Session zero
  pacing: PacingSchema,

  // Combat detail level
  // Cross-ref: spec/08-cross-cutting.md §Session zero
  combat_granularity: CombatGranularitySchema,

  // TBD: X-card and Stars & Wishes affordances once safety tooling design is settled
  // Cross-ref: spec/11-dm-styles-tones.md §5 Safety / consent tooling

  // When session zero was completed (wall-clock)
  completed_at: z.number().int().positive().optional(), // Timestamp brand omitted to avoid import
}).strict();
export type SessionZero = z.infer<typeof SessionZeroSchema>;

// ---------------------------------------------------------------------------
// Test factory
// ---------------------------------------------------------------------------
export function makeSessionZero(overrides: Partial<SessionZero> = {}): SessionZero {
  return SessionZeroSchema.parse({
    campaign_id: 'test_smallest',
    tone: 'heroic',
    content_lines: [],
    veils: [],
    lethality: 'standard',
    pacing: 'fast-cut',
    combat_granularity: 'narrative',
    ...overrides,
  });
}
