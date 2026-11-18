# Implementation Plan: Link reputation check

## Overview

Build the optional, consented link lookup described in `requirements.md` and
`design.md`. Order: pipeline types and config (group 1), server module
`src/server/reputation/` (group 3), pipeline integration (group 5), API handler
and `maxDuration` change (group 7), client request (group 9), UI logic
(group 10), components (group 12), steering, README and `.env.example`
(group 13). `src/core/` and `UrlAnalyzer` are not changed. No new dependency is
added. Numbering continues after PBT-115.

## Environment

- OS: Windows, shell: Windows PowerShell 5.1. Never chain with `&&`.
- Run tests with `vitest run` (single pass, node environment, no network).
  Tests use `FakeReputationProvider`, fake `fetch`, fake clocks and standard
  `Request` and `Response`.
- Relative imports only. `src/pipeline` imports nothing from `src/server`.
  `src/server/reputation` imports nothing from `src/pipeline`, `src/ui`,
  `src/components` or browser-only packages.
- Do not implement beyond the task being executed. English text, Vietnamese
  drafts and the exact steering wording come from `design.md`; do not reword
  them.
- Property tests use `numRuns >= 100` and carry the tag comment
  `Feature: link-reputation-check, Property <n>: <title>`. Property tests are
  in separate files per property so that tasks in one wave never write the same
  file.

## Dependencies on other specs

- **Groups 10 (tasks 10.7 and 10.8) and 12 need `ui-page` group 8 (Link
  spotlight, `LinkSpotlight.tsx`, section `linkSpotlight` in `page-layout.ts`)
  to be done first.** Do not start them while `.kiro/specs/ui-page/tasks.md`
  group 8 has unchecked tasks. If group 8 is not done, stop and report; do not
  build the spotlight inside this spec.
- `link-creatures` and `ui-page` groups 1 to 7 are already done and are not
  reopened. Existing tests are edited only where they pin changed facts (see
  "Edited existing tests" in `design.md`).
- Group 7 task 7.6 changes `maxDuration` from 15 to 20 (design, "Tensions"
  item 1). The maintainer must confirm the hosting plan allows it.

## Tasks

- [x] 1. Types and pipeline configuration
  - [x] 1.1 Create `src/analyzers/reputation-checker.ts`
    - Types and the constant `REPUTATION_LISTED_SIGNAL_ID` only, no I/O, no imports (design A); export from the analyzers index only if it already exports types
    - _Requirements: REQ-LREP-19, REQ-LREP-30, REQ-LREP-36_
  - [x] 1.2 Pipeline config constants and limitation text
    - `pipeline.config.ts`: `REPUTATION_PIPELINE_TIMEOUT_MS = 6500`; `rules.config.ts`: `REPUTATION_LISTED_SEVERITY = 0.75` and rule `reputation-listed` with `minLevel: "high"`; `awareness.config.ts`: add `url.reputation-listed` to `BLOCKING_SIGNAL_IDS`; add the id to the pipeline's allowed signal ids
    - Create `src/pipeline/reputation.config.ts` (`CATEGORY_PRIORITY`, `CATEGORY_LABELS`, `LISTED_WHY`); add `LIMITATIONS_REPUTATION` to `messages.config.ts` and `reputationListed?: boolean` to `buildLimitations` in `messages.ts` (adds the key once)
    - Update `config.test.ts`, `combine.test.ts`, `messages.test.ts` for the new rule, constants and limitation
    - _Requirements: REQ-LREP-25, REQ-LREP-32, REQ-LREP-33, REQ-LREP-36, REQ-LREP-37_

- [x] 2. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Server module `src/server/reputation/`
  - [x] 3.1 Create `reputation.config.ts` and `reputation-config.ts`
    - Endpoint, `MAX_PREFIXES_PER_REQUEST = 100`, threat table, limits table; `readReputationConfig(env)` (total, zod, digits-only rule, clamp, states `ready`, `not-configured`, `off`, non-enumerable `apiKey`)
    - Write `reputation-config.test.ts` (defaults table, blank, non-string, clamp, `off`, `not-configured`)
    - _Requirements: REQ-LREP-08, REQ-LREP-21, REQ-LREP-24, REQ-LREP-59, REQ-LREP-60, REQ-LREP-61, REQ-LREP-62, REQ-LREP-63_
  - [x] 3.2 Property test PBT-126 in `reputation-config.property.test.ts`
    - **Property: config is total and bounded (PBT-126)**
    - **Validates: Requirements REQ-LREP-59 to REQ-LREP-63**
  - [x] 3.3 Create `url-expressions.ts` and `url-expressions.test.ts`
    - `toLookupUrl`, `expressionsOf`, `sha256`, `prefixOf`, `toBase64Url`, `fromBase64Any` as in design B; `normalizeUrl` first; only module importing `node:crypto`
    - Tests: the Google vectors listed in design B, escapes, double unescape, dot segments, IDN to punycode, IPv4 spellings, IPv4-mapped IPv6, userinfo, port and fragment dropped, at most 30 expressions
    - _Requirements: REQ-LREP-04, REQ-LREP-20, REQ-LREP-29_
  - [x] 3.4 Property test in `url-expressions.property.test.ts`
    - Expressions are deterministic, distinct, at most 30, free of userinfo, port, fragment and scheme; prefixes are exactly 4 bytes
    - **Property: expression and prefix invariants (supports PBT-117, PBT-120)**
    - **Validates: Requirements REQ-LREP-04, REQ-LREP-20**
  - [x] 3.5 Create `safe-browsing-provider.ts` and its tests
    - `createSafeBrowsingProvider`: one GET, `X-Goog-Api-Key` header, sorted `hashPrefixes`, `cache: "no-store"`, `redirect: "error"`, `credentials: "omit"`, `referrerPolicy: "no-referrer"`, abort timeout, no retry, loose zod schema, 32-byte hash check, enforceable-detail rule (a detail with any attribute is disregarded, unknown threat type maps to `"other"`)
    - Write `safe-browsing-provider.test.ts`: wire format, 200 empty, 429, 5xx, network error, bad JSON, bad hash length, `CANARY` detail, timeout with fake timers
    - _Requirements: REQ-LREP-04, REQ-LREP-05, REQ-LREP-22, REQ-LREP-23, REQ-LREP-24_
  - [x] 3.6 Create `fake-reputation-provider.ts`
    - `FakeReputationProvider` (`responding`, `degraded`, `throwing`, `hanging`, `listing`, recorded `calls`) and `fakeFetchCapturing`
    - _Requirements: REQ-LREP-19, REQ-LREP-23_
  - [x] 3.7 Create `reputation-checker.ts` and `index.ts`; write `reputation-checker.test.ts`
    - `createReputationChecker` steps 1 to 6 of design B; export public items from `index.ts`
    - Tests: empty and all-malformed lists make zero gate and provider calls; truncation to whole URLs with a small `maxPrefixes` gives `too-many-links`; gate called once and only with a prefix; denied or throwing gate gives `rate-limited`; prefix match without full-hash match is not a hit
    - _Requirements: REQ-LREP-05, REQ-LREP-19, REQ-LREP-20, REQ-LREP-21, REQ-LREP-29_
  - [x] 3.8 Property test PBT-116 in `reputation-checker.property.test.ts`
    - **Property: the checker is total and makes at most one request (PBT-116)**
    - **Validates: Requirements REQ-LREP-19, REQ-LREP-23, REQ-LREP-29**
  - [x] 3.9 Property test PBT-117 (outbound request) in `reputation-checker.privacy.property.test.ts`
    - Marker strings in text, path, query, userinfo and fragment; captured fake `fetch` shows only the key and 4-byte unpadded web-safe prefixes equal to a URL expression prefix
    - **Property: privacy of the outbound request (PBT-117)**
    - **Validates: Requirements REQ-LREP-04, REQ-LREP-07**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Pipeline integration
  - [x] 5.1 `verdict.ts`: `ReputationOutcome` and `Verdict.reputation`
    - Add the types; set `reputation` in `assemble`'s signature, `fallbackVerdict` and the empty-input branch as in design C; add one shared test helper and update every fixture that builds a full `Verdict` (one line per fixture)
    - _Requirements: REQ-LREP-35_
  - [x] 5.2 Create `src/pipeline/reputation.ts` and `reputation.test.ts`
    - `runReputation` (never rejects; timeout aborts; non-conforming result gives `invalid-response`) and `listingSignals` (one Signal per distinct host, evidence `<host> (<label>)`, `createSignal` throw skips the host)
    - Tests: no checker, no URLs, timeout, throwing checker, two hosts, path and query absent from evidence
    - _Requirements: REQ-LREP-25, REQ-LREP-30, REQ-LREP-34, REQ-LREP-35, REQ-LREP-38_
  - [x] 5.3 Edit `pipeline.ts` and the pipeline index
    - Option `reputationChecker` and test hook `reputationTimeoutMs`; start `runReputation` before the analyzers are awaited; add its signals before `shortenEvidence`; pass `reputation` and `reputationListed` to `assemble`; update `pipeline.test.ts` and `pipeline.property.test.ts` for the new field
    - _Requirements: REQ-LREP-25, REQ-LREP-30, REQ-LREP-31, REQ-LREP-35, REQ-LREP-37_
  - [x] 5.4 Property test PBT-120 in `reputation.property.test.ts`
    - Honest and dishonest fake provider answers, several URLs per host; a URL is a hit only if a returned full hash with an enforceable detail equals the full hash of one of its expressions
    - **Property: listed means full-hash equality (PBT-120)**
    - **Validates: Requirements REQ-LREP-05, REQ-LREP-30, REQ-LREP-38**
  - [x] 5.5 Property test PBT-121 in `reputation.score.property.test.ts`
    - **Property: the aggregator and the rules own the score (PBT-121)**
    - **Validates: Requirements REQ-LREP-31 to REQ-LREP-34, REQ-LREP-37, REQ-LREP-38**
  - [x] 5.6 Property test PBT-122 in `awareness.reputation.property.test.ts`
    - **Property: awareness never lowers a listed result (PBT-122)**
    - **Validates: Requirements REQ-LREP-33**
  - [x] 5.7 Property test PBT-125 (pipeline part) in `reputation.timeout.property.test.ts`
    - Fake timers and a hanging checker: verdict returns with `reputation` equal to `degraded / timeout` and the abort signal fired
    - **Property: timeouts degrade, never fail the scan (PBT-125)**
    - **Validates: Requirements REQ-LREP-22, REQ-LREP-25**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. API handler and `maxDuration`
  - [x] 7.1 `analyze-request.ts`: add `checkLinks: z.boolean().optional()`
    - `ParsedRequest.input.checkLinks`; update `analyze-request.test.ts` (`"true"`, `1`, `null`, `[]` rejected; body with only `checkLinks` rejected)
    - _Requirements: REQ-LREP-10, REQ-LREP-11, REQ-LREP-12_
  - [x] 7.2 Create `reputation-gate.ts` and `reputation-gate.test.ts`
    - `createReputationGate` (memoized, throwing budget counts as denial, `outcome()` of `used`, `denied`, `skipped`)
    - _Requirements: REQ-LREP-14, REQ-LREP-16, REQ-LREP-17_
  - [x] 7.3 Create `reputation-mode.ts` and `reputation-mode.test.ts`; edit `log-event.ts`
    - `deriveReputationMode` in the order of REQ-LREP-15, plus `skipped` when `reputation.status` is `ok` and `checkedCount` is 0 (design tension 3); `AnalyzeLogEvent.reputationMode` of type `LogReputationMode`
    - _Requirements: REQ-LREP-15, REQ-LREP-18_
  - [x] 7.4 Edit `analyze-handler.ts`
    - Optional `deps.reputation`; create the gate and checker only when `checkLinks === true`, `createChecker` in `try/catch`; pass the lazy checker to `createPipeline`; set `meta.reputationMode` (fallback `failed`); log `reputationMode` (`"none"` on every non-200 exit); update `analyze-handler.test.ts`, `analyze-handler.property.test.ts` and `analyze-response.test.ts` for `meta` and the log shape
    - _Requirements: REQ-LREP-03, REQ-LREP-13, REQ-LREP-14, REQ-LREP-15, REQ-LREP-16, REQ-LREP-17, REQ-LREP-18_
  - [x] 7.5 Edit `default-handler.ts`; update `route.test.ts` meta
    - Read `readReputationConfig(process.env)` once; for state `ready` build the provider, a `createLlmBudget` and `createChecker`; for `not-configured` and `off` pass no `reputation`; `route.test.ts` expects `meta` equal to `{ semanticMode: "not-configured", reputationMode: "not-requested" }`
    - _Requirements: REQ-LREP-08, REQ-LREP-27, REQ-LREP-59, REQ-LREP-63_
  - [x] 7.6 Change `maxDuration` from 15 to 20 (design, "Tensions" item 1)
    - Edit `src/app/api/analyze/route.ts`; edit the `maxDuration` assertion (REQ-API-02 value) in `route.test.ts`; edit the `maxDuration` sentence in `README.md`; edit the comment in `src/client/ingest/ingest.config.ts` (client timeout stays 20 s)
    - Do not touch the `meta` assertion here (task 7.5)
    - _Requirements: REQ-LREP-25, REQ-LREP-26_
  - [x] 7.7 Create `src/pipeline/timing.test.ts`
    - Read `REPUTATION_PIPELINE_TIMEOUT_MS`, `SEMANTIC_TIMEOUT_MS`, the largest `LINK_REPUTATION_TIMEOUT_MS` bound and `maxDuration` from `route.ts`; fail when the timeout is not above 6000 or the margin is below 2000 ms
    - **Property: timeout constants keep the margin (PBT-125, constants part)**
    - **Validates: Requirements REQ-LREP-25, REQ-LREP-26**
  - [x] 7.8 Property tests PBT-118 and PBT-119 in `analyze-handler.reputation.property.test.ts`
    - **Property: without consent nothing is looked up (PBT-118)**
    - **Property: `checkLinks` accepts only the booleans (PBT-119)**
    - **Validates: Requirements REQ-LREP-03, REQ-LREP-10 to REQ-LREP-12, REQ-LREP-16, REQ-LREP-17, REQ-LREP-34**
  - [x] 7.9 Property test PBT-123 in `reputation-mode.property.test.ts`
    - **Property: reputation mode follows a fixed order (PBT-123)**
    - **Validates: Requirements REQ-LREP-15, REQ-LREP-18**
  - [x] 7.10 Property tests PBT-124 and PBT-117 (handler part)
    - `reputation-gate.property.test.ts`: budget bounds, denied attempts not counted, gate once per request; add to `analyze-handler.reputation.property.test.ts` (after task 7.8): denied or throwing budget gives 200 with a rule-based verdict and zero provider calls; no log event or response body contains a marker, expression or hash
    - Read PBT-124 as "no provider call and an identical rule-based verdict" (design tension 2)
    - **Property: the budget is bounded, lazy and once per request (PBT-124)**
    - **Property: privacy of logs and responses (PBT-117)**
    - **Validates: Requirements REQ-LREP-07, REQ-LREP-14, REQ-LREP-16, REQ-LREP-17, REQ-LREP-28**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Client request
  - [x] 9.1 Edit `src/client/ingest/types.ts` and `analyze-input.ts`
    - `AnalyzeRequest.checkLinks?: true`; `BuildAnalyzeInput.checkLinks?: unknown`; set `checkLinks = true` only when `input.checkLinks === true` and the request has at least one URL (in `urls` or extracted from the truncated text); update `analyze-input.test.ts`
    - _Requirements: REQ-LREP-02, REQ-LREP-09_
  - [x] 9.2 Edit `analyze-client.ts`
    - `buildBody` copies `checkLinks` only when exactly `true`; `okResult` returns `reputationMode` only for the six known values; update `analyze-client.test.ts` and `analyze-client.property.test.ts`; the only host stays `/api/analyze`
    - _Requirements: REQ-LREP-02, REQ-LREP-09_
  - [x] 9.3 Property test PBT-129 in `analyze-input.reputation.property.test.ts`
    - **Property: the request builder sets `checkLinks` only when allowed (PBT-129)**
    - **Validates: Requirements REQ-LREP-02, REQ-LREP-10**

- [x] 10. UI logic (`src/ui/`; tasks 10.7 and 10.8 need `ui-page` group 8 done first)
  - [x] 10.1 Eighth link creature and attribution address
    - `link-creatures.ts`: entry `plague-mark` at index 7, `LinkCreatureId`, optional `explanationKey`; `link-creatures-view.ts` uses `c.explanationKey ?? tone.explanationKey`; create `src/ui/reputation.config.ts` with `ADVISORY_URL`; update `link-creatures.test.ts` (eight entries, tone counts, first seven unchanged) and `link-creatures-view.test.ts`
    - _Requirements: REQ-LREP-50, REQ-LREP-49_
  - [x] 10.2 Signal id, tier rule and dictionary keys
    - `signal-ids.ts` (24 ids), `voice.ts` (`reputation\.` is tier C), `en.ts` and `vi.ts` with every key in the design tables; update `signal-ids.test.ts`, `link-wording.property.test.ts` and `link-creatures.property.test.ts` key sets
    - _Requirements: REQ-LREP-36, REQ-LREP-39, REQ-LREP-40, REQ-LREP-45, REQ-LREP-46, REQ-LREP-47, REQ-LREP-49_
  - [x] 10.3 Property test PBT-128 in `i18n/reputation-wording.property.test.ts`
    - **Property: dictionary wording rules hold for every new key (PBT-128)**
    - **Validates: Requirements REQ-LREP-41, REQ-LREP-45, REQ-LREP-46, REQ-LREP-47**
  - [x] 10.4 Theme token `link-plague-mark`
    - Add to `COLOR_TOKENS` and both palettes in `palettes.ts` (`#DDE36B`, `#F0F4A8`); add to `LINK_TOKENS` in `pairs.ts` (16 `text` pairs and 16 `ui` pairs); update `link-creatures.contrast.property.test.ts`; do not change thresholds
    - _Requirements: REQ-LREP-51_
  - [x] 10.5 Property test PBT-130 in `theme/plague-mark.property.test.ts`
    - **Property: contrast and creature table (PBT-130)**
    - **Validates: Requirements REQ-LREP-50, REQ-LREP-51**
  - [x] 10.6 Create `view/reputation-note.ts` and `reputation-note.test.ts`
    - `buildReputationNote(verdict, mode)` total; rules as in design F
    - _Requirements: REQ-LREP-39, REQ-LREP-40, REQ-LREP-43, REQ-LREP-56, REQ-LREP-57_
  - [x] 10.7 Property test PBT-127 in `view/reputation-note.property.test.ts`
    - Needs task 10.8 and `ui-page` group 8
    - **Property: the result view treats reputation as a note only (PBT-127)**
    - **Validates: Requirements REQ-LREP-39 to REQ-LREP-44, REQ-LREP-48, REQ-LREP-56, REQ-LREP-57**
  - [x] 10.8 View model, layout and journal
    - Needs `ui-page` group 8 (`linkSpotlight` section already in `page-layout.ts`). `result-view.ts`: `reputationNote` field; `page-layout.ts`: section `reputationNote` right after `levelBanner` when no creature exists, none otherwise; `journal.ts` and `notices.ts`: page 2 and note count; export from `src/ui/index.ts`; update `result-view.test.ts`, `page-layout.test.ts`, `journal.test.ts`, `link-creatures-view.property.test.ts`
    - _Requirements: REQ-LREP-42, REQ-LREP-43, REQ-LREP-44, REQ-LREP-53, REQ-LREP-55, REQ-LREP-56, REQ-LREP-57_
  - [x] 10.9 Edit `run-check.ts`
    - `CheckInput.checkLinks` passed to `buildAnalyzeRequest`; `ResultExtras.reputationMode` set from the client result; update `run-check.test.ts` and `run-check.property.test.ts`
    - _Requirements: REQ-LREP-02, REQ-LREP-56_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Components (all tasks need `ui-page` group 8 done first)
  - [x] 12.1 Plague Mark art
    - `art/link-creatures.tsx`: `creature-plague-mark` registered in `LINK_ART` (inline SVG, no external reference); update `art/link-creatures.test.ts` and `art/registry.test.ts` (eight art keys, budget 30 KB each and 350 KB total)
    - _Requirements: REQ-LREP-50, REQ-LREP-52_
  - [x] 12.2 Create `ReputationNote.tsx` and `ReputationNote.test.ts`
    - Plain `<p>` text, `rem` sizes, no `<a`, `href` or `onClick`
    - _Requirements: REQ-LREP-39, REQ-LREP-40, REQ-LREP-55_
  - [x] 12.3 Create `ReputationAttribution.tsx` and `ReputationAttribution.test.ts`
    - The one anchor: `href={ADVISORY_URL}`, `target="_blank"`, `rel="noopener noreferrer"`, `referrerPolicy="no-referrer"`, hidden new-tab text; rendered only when a Listing_Signal exists
    - _Requirements: REQ-LREP-46, REQ-LREP-49_
  - [x] 12.4 Edit `BagPanel.tsx` and `BagPanel.test.ts`
    - Consent_Box (design G): native checkbox, visible label, `aria-describedby`, `h-11 w-11`, unchecked by default; props `checkLinks` and `onCheckLinksChange`
    - _Requirements: REQ-LREP-01, REQ-LREP-06, REQ-LREP-58_
  - [x] 12.5 Edit `App.tsx`
    - `useState(false)` for the flag; `submit` captures it, then `setCheckLinks(false)` at once; `reset` sets it to `false`; pass it to `runCheck`; never write it to storage
    - _Requirements: REQ-LREP-01, REQ-LREP-02, REQ-LREP-58_
  - [x] 12.6 Edit `LinkSpotlight.tsx`, `ResultPanel.tsx`, `EvidenceList.tsx`
    - `LinkSpotlight` takes optional `note` and renders `ReputationNote` after the badges; `ResultPanel` gets `case "reputationNote"`; `EvidenceList` renders `ReputationAttribution` in the card whose `signalId` is `url.reputation-listed`; update `ResultPanel.test.ts` and `EvidenceList` tests; add the Plague Mark and not-listed examples
    - _Requirements: REQ-LREP-53, REQ-LREP-54, REQ-LREP-55_
  - [x] 12.7 Source-scan rules in `components.boundaries.test.ts`
    - `ReputationAttribution.tsx` has exactly one `<a` with the three attributes and is outside `NO_LINK_FILES`; `ReputationNote.tsx` has no `<a`, `href`, `onClick`; `BagPanel.tsx` and `App.tsx` contain no `localStorage`, `sessionStorage`, `indexedDB` or `document.cookie` for the flag; the hard-coded text scan covers the new files; add sanity cases
    - _Requirements: REQ-LREP-01, REQ-LREP-09, REQ-LREP-55_

- [x] 13. Steering, README and `.env.example`
  - [x] 13.1 Edit `.kiro/steering/privacy-and-safety.md`
    - Core commitment, data-flow rule 6, two table rows, dependency hygiene bullets: exact wording of design H.1
    - _Requirements: REQ-LREP-66_
  - [x] 13.2 Edit `.kiro/steering/product.md`
    - Replace the last "done" line (design H.2); principle 3 is not changed (design tension 7)
    - _Requirements: REQ-LREP-66_
  - [x] 13.3 Edit `.kiro/steering/tech.md`
    - Four environment variable rows (design H.3)
    - _Requirements: REQ-LREP-66_
  - [x] 13.4 Edit `.kiro/steering/api-rules.md`
    - Front matter pattern, settings bullet, logging bullet, new bullet (design H.4)
    - _Requirements: REQ-LREP-66_
  - [x] 13.5 Edit `.kiro/steering/verdict-rules.md`
    - Two bullets after the awareness bullet (design H.5); keep the front matter
    - _Requirements: REQ-LREP-66_
  - [x] 13.6 Edit `.env.example`
    - The commented block of design J: four lines with placeholder values, unit, default, bounds and privacy effect; no real key
    - _Requirements: REQ-LREP-64_
  - [x] 13.7 Edit `README.md`
    - Section "Link reputation check": consent rule, data sent, "not listed is not safe", `checkLinks`, table of six `reputationMode` values, non-commercial note; keep the `maxDuration` sentence from task 7.6
    - _Requirements: REQ-LREP-65_
  - [x] 13.8 Create `src/server/reputation/docs.test.ts`
    - Source scan: `.env.example` and `README.md` contain the four variables and the privacy paragraph; the five steering files contain the wording of design H; `README.md` contains each `reputationMode` value
    - _Requirements: REQ-LREP-64, REQ-LREP-65, REQ-LREP-66_
  - [x] 13.9 Create `src/server/reputation/boundaries.test.ts`
    - `LINK_REPUTATION_` only in `reputation-config.ts`; no `NEXT_PUBLIC_`; `safebrowsing.googleapis.com` only in `reputation.config.ts`; import rules for all layers (REQ-LREP-67, REQ-LREP-68); no new dependency in `package.json`; add sanity cases
    - _Requirements: REQ-LREP-08, REQ-LREP-09, REQ-LREP-59, REQ-LREP-67, REQ-LREP-68_

- [ ] 14. Final checkpoint
  - Run `vitest run`, `npx tsc --noEmit`, `npm run lint` and `npx next build`
  - Confirm `git status` shows changes only in the files named in this plan and `.kiro/specs/link-reputation-check/`
  - Manual check (maintainer, real key, run `npm run dev` yourself): follow "Manual check" in `design.md`; confirm the release conditions listed there (non-commercial use, quota, Vietnamese review, attribution link D8, `maxDuration = 20`)

## Notes

- No task is marked optional: this spec follows the other specs, where tests are ordinary sub-tasks.
- Each property PBT-116 to PBT-130 has its own sub-task. PBT-117, PBT-124 and PBT-125 are split into two sub-tasks each because they cover separate files.
- Groups 10 (10.7, 10.8) and 12 depend on `ui-page` group 8, which is outside this task graph. Check it before starting those tasks.
- Vietnamese text and the creature name are drafts pending human review; tests do not pin Vietnamese wording.
- Real Safe Browsing calls are never made by tests.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "7.1", "7.6", "9.1", "10.4", "13.1", "13.2", "13.3", "13.4", "13.5", "13.6"] },
    { "id": 1, "tasks": ["1.2", "3.1", "3.3", "7.2", "9.2", "10.1", "10.2", "13.7"] },
    { "id": 2, "tasks": ["3.2", "3.4", "3.5", "5.1", "7.7", "9.3", "10.3", "10.5", "10.6", "13.8"] },
    { "id": 3, "tasks": ["3.6", "5.2", "7.3", "10.8", "10.9", "12.1", "12.2", "12.3", "12.4"] },
    { "id": 4, "tasks": ["3.7", "5.3", "7.9", "10.7", "12.5", "12.6"] },
    { "id": 5, "tasks": ["3.8", "3.9", "5.4", "5.5", "5.6", "5.7", "7.4", "12.7"] },
    { "id": 6, "tasks": ["7.5", "7.8"] },
    { "id": 7, "tasks": ["7.10", "13.9"] }
  ]
}
```
