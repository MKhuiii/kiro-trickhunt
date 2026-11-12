# Tech — TrickHunt

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript — strict mode everywhere |
| Styling | Tailwind CSS |
| API layer | tRPC (end-to-end type safety) |
| Validation | Zod (all external inputs) |
| OCR | Tesseract.js 7.0.0 (WASM, browser-only) |
| QR decode | zxing-wasm 3.1.6 (WASM, browser-only) |
| Unit / integration tests | Vitest |
| Property-based tests | fast-check |
| E2E tests | Playwright |
| Deploy | Vercel |

## Repository layout

```
src/
  core/          — pure engine: Signal, Aggregator, Analyzer interface
  analyzers/     — concrete Analyzer implementations (URL, text, image)
  app/           — Next.js App Router pages and layouts
  components/    — React UI components
  server/        — tRPC routers (LLM proxy, no raw user content stored)
  lib/           — shared utilities
```

## Core engine rules

The `src/core/` package is framework-agnostic and environment-agnostic.

- No imports from `next`, `react`, `window`, `document`, or `process`.
- Exported only via `src/core/index.ts`.
- Every public function is a pure function or returns a `Promise` that never rejects.

See `.kiro/specs/core-engine/` for the full spec.

## Coding conventions

- Prefer `const` and immutable data. Mutating a `Signal` is a bug.
- Validate at boundaries with Zod; trust validated types inside a module.
- Async analyzer implementations must catch their own errors — never propagate
  a rejection out of `Analyzer.analyze`.
- No `any`. Use `unknown` for truly unknown inputs, then narrow.
- File names: `kebab-case.ts`, React components: `PascalCase.tsx`.

## Testing rules

- Every new module in `src/core/` needs a Vitest unit test file alongside it.
- Property tests live in `*.property.test.ts` files.
- Run tests with `vitest run` (single pass, no watch) in CI.
- A failing property test is treated the same as a failing unit test — it blocks merge.

## Environment variables

| Variable | Used in | Purpose |
|---|---|---|
| `LLM_API_KEY` | server only | Key for the LLM provider |
| `LLM_BASE_URL` | server only | Endpoint override (for local models) |

No environment variables are exposed to the browser (`NEXT_PUBLIC_` prefix is
not used for secrets).
