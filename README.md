# rpg-engine

An LLM-powered RPG engine. Design documents live in `design/`; implementation is tracked from the v0.1 milestone spec at `design/15-v01-milestone.md`.

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Wave-2 CLI entry point (not yet implemented) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm test` | Run test suite once (vitest) |
| `npm run test:watch` | Re-run tests on file change |
| `npm run lint` | ESLint — zero warnings enforced |
| `npm run format` | Prettier — reformat everything |
| `npm run type-check` | `tsc --noEmit` — types only, no emit |
| `npm run check` | `type-check` + `lint` + `test` — run before committing |

## Getting started

```sh
npm install
npm run check
```
