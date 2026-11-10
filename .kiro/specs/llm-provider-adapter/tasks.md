# Tasks — TrickHunt LLM Provider Adapter

## Environment
- OS: Windows, shell: Windows PowerShell 5.1.
- Never chain commands with `&&`; use `;` or run them separately.
- Always make commands non-interactive: `npx --yes`, `--yes` flags.
- Run tests with `vitest run` (single-pass, no watch).
- Tests never touch the network and never need a real key: fake `fetch` only.
- Do not change `src/analyzers/llm-client.ts`, `src/core/` or any analyzer.
- Pin new dependencies to exact versions.

## Task 1 — Environment files and dependencies

- [x] In `.gitignore`, replace the `.env` line with `.env*` and add
      `!.env.example` (REQ-LLM-21); confirm `git check-ignore .env` matches and
      `git check-ignore .env.example` does not
- [x] Write `.env.example` with placeholders and comments for all six
      variables (REQ-LLM-20)
- [x] Move `zod` to `dependencies`; add exact-pinned `tsx` to
      `devDependencies`

## Task 2 — Config reader

- [x] Create `src/server/llm/llm-config.ts` (REQ-LLM-01 to REQ-LLM-06)
- [x] Unit tests: valid env, missing key, missing model, blank values, bad
      base URL (`ftp:`, credentials, plain `http:` remote), `http://localhost`
      accepted, trailing slash removed, `apiKey` absent from
      `JSON.stringify`
- [x] Property tests PBT-26

## Task 3 — Error type and adapter

- [x] Create `src/server/llm/llm-client-error.ts` (REQ-LLM-15)
- [x] Create `src/server/llm/openai-compatible-client.ts` (REQ-LLM-07 to
      REQ-LLM-14, REQ-LLM-16)
- [x] Unit tests: 200 returns text; 401 gives `http-status`; wrong shape,
      empty `choices`, empty content give `bad-shape`; never-resolving fetch
      gives `timeout`; caller abort gives `network`; pre-aborted signal does
      not call fetch; request URL, method, headers and body fields
- [x] Property tests PBT-23, PBT-24, PBT-25

## Task 4 — Factory

- [x] Create `src/server/llm/create-llm-client.ts` and `index.ts` (REQ-LLM-17
      to REQ-LLM-19)
- [x] Unit tests: returns `null` without key, model or base URL; returns a
      client otherwise; `fetchImpl` never called at creation; chain test with
      `analyzeSemantic` (200 gives `ok`, 500 gives `degraded/client-error`)
- [x] Property test PBT-27

## Task 5 — Smoke script and docs

- [x] Create `scripts/smoke-llm.ts` (REQ-LLM-22, REQ-LLM-23)
- [x] Add a README section with the run command
      `npx tsx --env-file=.env scripts/smoke-llm.ts`, the one-real-request
      warning and the rules-only behaviour (REQ-LLM-24)
- [x] Verify `vitest run` does not execute the script

## Task 6 — Final checks

- [x] `grep` confirms: no `process.env` outside `llm-config.ts` in
      `src/server/llm/`; no `console.` in `src/server/llm/`; no import from
      `src/server` in `src/analyzers` or `src/core`; no `NEXT_PUBLIC_`
      anywhere; no vendor name, URL or model id in code
- [x] Run `vitest run`, `tsc --noEmit` and `npm run lint`; confirm
      `git status` shows no `.env` staged
