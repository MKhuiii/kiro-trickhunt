# Tasks — TrickHunt Semantic Analyzer

## Environment
- OS: Windows, shell: Windows PowerShell 5.1.
- Never chain commands with `&&`; use `;` or run them separately.
- Always make commands non-interactive: `npx --yes`, `--yes` flags.
- Run tests with `vitest run` (single-pass, no watch).
- Tests never touch the network: use `FakeLlmClient`.

## Task 0 — Type widening (confirm first, see design "Type note")

- [x] Add `"semantic"` to `SignalSource` in `src/core/signal.ts`; run the
      existing core and analyzer tests to confirm nothing changes

## Task 1 — Config and client interface

- [x] Create `src/analyzers/semantic-analyzer.config.ts` (REQ-SEM-01 to
      REQ-SEM-05)
- [x] Create `src/analyzers/llm-client.ts` and `fake-llm-client.ts`
- [x] Unit test: six ids exactly, non-empty `whyItMatters`, every
      `maxSeverity` in `(0, SEVERITY_CAP]`, `SEVERITY_CAP < 1`

## Task 2 — Redaction

- [x] Implement `redactSensitive` (REQ-SEM-06 to REQ-SEM-10)
- [x] Unit tests: OTP `482913`, `+84 912 345 678`, `0912345678`, 16-digit card,
      email, clean text unchanged
- [x] Property tests PBT-18, PBT-19

## Task 3 — Prompt

- [x] Implement `buildPrompt` and delimiter constants (REQ-SEM-11 to
      REQ-SEM-15)
- [x] Unit tests: system prompt mentions untrusted data and every id; input
      containing both delimiters is neutralized
- [x] Property test PBT-20

## Task 4 — Parsing

- [x] Implement `parseEnvelope` and `parseLlmResponse` (REQ-SEM-16 to
      REQ-SEM-22)
- [x] Unit tests: code fence, injected `verdict` field ignored, made-up id
      dropped, evidence not in text dropped, severity clamped, duplicate ids,
      more than `MAX_SIGNALS`
- [x] Property test PBT-21

## Task 5 — analyzeSemantic

- [x] Implement `analyzeSemantic` with truncation, redaction, single call,
      timeout and abort (REQ-SEM-23 to REQ-SEM-28)
- [x] Unit tests: normal response gives `ok`; timeout gives `degraded/timeout`;
      throwing client gives `client-error`; garbage gives `invalid-response`;
      blank input gives `skipped` with zero client calls; client receives
      redacted text only
- [x] Property tests PBT-16, PBT-17, PBT-22

## Task 6 — SemanticAnalyzer

- [x] Implement `SemanticAnalyzer` with optional `onResult` (REQ-SEM-29 to
      REQ-SEM-32)
- [x] Unit tests: register in `AnalyzerRegistry` and run via
      `analyze("semantic", text)`; `onResult` receives the status; throwing
      `onResult` is swallowed
- [x] Verify `src/analyzers/semantic-analyzer*.ts` imports nothing from
      `next`, `react`, `window`, `document`, `process`
