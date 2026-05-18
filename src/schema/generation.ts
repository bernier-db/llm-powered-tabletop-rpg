// src/schema/generation.ts
// Cross-ref: design/06-generation.md §Reusable generation contract
//            design/14-glossary.md §Generator Agent, §Two-Layer Pattern, §Canon Preservation Rule
//            design/13-risks-tripwires.md §2 (every generation prompt starts with canon retrieval)
//            design/13-risks-tripwires.md §16 (generated entities are permanent after canon commit)
import { z } from 'zod';
import { EntityRefSchema } from './common.js';
import { CodexEntrySchema } from './codex.js';

// ---------------------------------------------------------------------------
// GenerationConstraints — what the generator must/must not do
// Cross-ref: design/06-generation.md §Reusable generation contract (constraints field)
//            design/06-generation.md §Anti-archetype counter-measures
// ---------------------------------------------------------------------------
export const GenerationConstraintsSchema = z.object({
  // Things that must appear in the generated entity
  must_include: z.array(z.string()).optional(),

  // Things that must not appear (anti-archetype counter-measures)
  // Cross-ref: design/06-generation.md §Anti-archetype counter-measures
  must_exclude: z.array(z.string()).optional(),

  // Thematic hints from the parent context (e.g. "this is a church-adjacent location")
  theme_hints: z.array(z.string()).optional(),

  // Override the session-zero tone for this generation only
  // Cross-ref: design/08-cross-cutting.md §Session zero; design/14-glossary.md §Tone
  tone_override: z.string().optional(), // TBD: constrain to ToneSchema values when imported
}).strict();
export type GenerationConstraints = z.infer<typeof GenerationConstraintsSchema>;

// ---------------------------------------------------------------------------
// VarietyState — usage tracking to bias generation away from overused patterns
// Cross-ref: design/06-generation.md §Anti-archetype counter-measures
//            design/06-generation.md §Two-layer pattern (skeleton rolls use this)
// ---------------------------------------------------------------------------
export const VarietyStateSchema = z.object({
  // Trait tags already used in this region/session (avoid repetition)
  traits_used: z.array(z.string()),

  // NPC names already in use in the same area (prevent name collisions)
  names_used: z.array(z.string()),

  // Archetypes/roles already filled in this region
  archetypes_used: z.array(z.string()),
}).strict();
export type VarietyState = z.infer<typeof VarietyStateSchema>;

// ---------------------------------------------------------------------------
// GenerationRequest<T> — the input contract for the Generator agent
// Cross-ref: design/06-generation.md §Reusable generation contract
// Generic over the entity type T (Actor, Location, Item, etc.)
// The canonical shape is preserved exactly from the design doc; the `T` type
// parameter annotates what the caller expects back — it is a phantom type here
// because Zod doesn't support runtime generics.
// TBD: consider a discriminated-union variant per entity kind if type safety is needed at parse time
// ---------------------------------------------------------------------------
export function makeGenerationRequestSchema<T extends z.ZodTypeAny>(entitySchema: T) {
  return z.object({
    // The parent entity in which the generated entity will live
    // e.g. { id: 'region_greyhill', kind: 'location' } for a settlement generation
    parent: EntityRefSchema,

    // What the generator must/must not do
    constraints: GenerationConstraintsSchema,

    // Pre-retrieved codex entries relevant to this generation
    // Cross-ref: design/13-risks-tripwires.md §2 (this MUST be populated — canon retrieval first)
    canon_snapshot: z.array(CodexEntrySchema),

    // Variety state for the parent context (trait/name/archetype usage)
    variety_state: VarietyStateSchema,

    // TBD: procedural skeleton output (from stage 1 of two-layer pattern)
    // The skeleton is computed by the engine before the LLM call; shape is entity-specific.
    // Cross-ref: design/06-generation.md §The two-layer pattern §1 Procedural skeleton
    skeleton: z.record(z.string(), z.unknown()).optional(),

    // Unused at runtime; carries the expected entity type for TypeScript inference
    _entity_schema: entitySchema.optional(),
  }).strict();
}

// Concrete non-generic version for validation without knowing T at parse time
export const GenerationRequestSchema = z.object({
  parent: EntityRefSchema,
  constraints: GenerationConstraintsSchema,
  canon_snapshot: z.array(CodexEntrySchema),
  variety_state: VarietyStateSchema,
  skeleton: z.record(z.string(), z.unknown()).optional(),
}).strict();
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

// ---------------------------------------------------------------------------
// GenerationHook — a follow-up generation trigger discovered during generation
// Cross-ref: design/06-generation.md §Reusable generation contract (follow_up_hooks)
//            e.g. "NPC mentioned a brother — generate if asked"
// ---------------------------------------------------------------------------
export const GenerationHookSchema = z.object({
  // Human-readable trigger condition
  trigger: z.string(), // e.g. "party asks about Vellis's brother"

  // What to generate when this hook fires
  entity_kind: z.string(), // e.g. 'actor', 'location', 'item'

  // Hint for the procedural skeleton step
  hint: z.string(), // e.g. "Vellis's brother; merchant; estranged; location: lowland city"

  // Priority (higher = generate sooner)
  priority: z.number().int().min(0).max(10),
}).strict();
export type GenerationHook = z.infer<typeof GenerationHookSchema>;

// ---------------------------------------------------------------------------
// GenerationResult<T> — the output contract from the Generator agent
// Cross-ref: design/06-generation.md §Reusable generation contract
// ---------------------------------------------------------------------------
export const GenerationResultSchema = z.object({
  // The generated entity (shape varies by entity kind — opaque here)
  // TBD: discriminated union per entity kind once all entity schemas are locked
  entity: z.unknown(),

  // The canonical ID assigned after committing to SQLite + codex
  // Cross-ref: design/13-risks-tripwires.md §16 (permanent after commit)
  committed_id: z.string(),

  // Follow-up hooks for lazy generation of mentioned-but-not-yet-created entities
  follow_up_hooks: z.array(GenerationHookSchema),
}).strict();
export type GenerationResult = z.infer<typeof GenerationResultSchema>;

// ---------------------------------------------------------------------------
// Test factories
// ---------------------------------------------------------------------------
export function makeGenerationConstraints(
  overrides: Partial<GenerationConstraints> = {},
): GenerationConstraints {
  return GenerationConstraintsSchema.parse({
    must_include: [],
    must_exclude: [],
    theme_hints: [],
    ...overrides,
  });
}

export function makeVarietyState(overrides: Partial<VarietyState> = {}): VarietyState {
  return VarietyStateSchema.parse({
    traits_used: [],
    names_used: [],
    archetypes_used: [],
    ...overrides,
  });
}

export function makeGenerationRequest(overrides: Partial<GenerationRequest> = {}): GenerationRequest {
  return GenerationRequestSchema.parse({
    parent: { id: 'region_greyhill', kind: 'location' },
    constraints: makeGenerationConstraints(),
    canon_snapshot: [],
    variety_state: makeVarietyState(),
    ...overrides,
  });
}

export function makeGenerationResult(overrides: Partial<GenerationResult> = {}): GenerationResult {
  return GenerationResultSchema.parse({
    entity: { id: 'generated-npc-001', name: 'Generated NPC' },
    committed_id: 'generated-npc-001',
    follow_up_hooks: [],
    ...overrides,
  });
}
