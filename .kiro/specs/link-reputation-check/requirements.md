# Requirements Document

## Introduction

Today the URL analyzer judges a link only by its text (seven `url.*` signals,
no network call). This feature adds an **optional** lookup of the links in a
scan against a third-party reputation list (default provider: Google Safe
Browsing), so TrickHunt can tell the user when a link appears on a list of
reported harmful sites.

The feature is a deliberate, narrow exception to the privacy rule "user content
is never forwarded to a third party". The exception holds only when every
condition below is met:

1. The user ticks an unticked consent box for that one scan.
2. Only derived link data leaves the server: a 4-byte SHA-256 prefix of each
   URL expression, never the message text, the image, the full URL or any user
   identifier. Matching of full hashes happens on our server.
3. The call is made from the server. The API key never reaches the browser.
4. Nothing is stored, cached or logged.

The risk score stays owned by the deterministic noisy-or aggregator. The lookup
contributes one Signal, `url.reputation-listed`. A link that is not listed is
never called safe.

Numbering: new `REQ-LREP-` series and `PBT-116` onward (the last existing
number is `PBT-115`, in `ui-page`).

**Hard constraints:**

- `src/core/` is NOT changed in behavior. It stays environment-agnostic and imports nothing new.
- The pipeline stays free of `next`, `react`, `window`, `document`, `process` and `src/server`. The reputation checker is injected, as the LLM client is.
- Analyzers and the pipeline never reject. A failed lookup never fails a scan.
- Zod validates every boundary. Strict TypeScript, no `any`. Relative imports only.
- All user-visible text is a dictionary key in `en` and `vi` with identical key sets.
- Tests never touch the network. They use a `FakeReputationProvider`, fake clocks and standard `Request` and `Response`.
- The tool never opens or visits a link. The lookup asks a list, not the site.

## Glossary

- **Reputation_Checker**: The injected function `check(urls, signal?) => Promise<ReputationResult>` that never rejects.
- **Reputation_Provider**: The adapter in `src/server/reputation/` that talks to the third-party service (default: Google Safe Browsing hash-prefix search).
- **Consent**: A per-scan, explicit user choice carried as `checkLinks: true` in the request. Absent means not given.
- **URL_Expression**: A canonical host-suffix and path-prefix string derived from a URL, as defined by the provider's hashing scheme.
- **Hash_Prefix**: The first 4 bytes of the SHA-256 of a URL_Expression. The only link data sent to the provider.
- **Listed**: At least one full hash returned by the provider equals the full SHA-256 of a URL_Expression of an analyzed URL. A prefix match alone is not Listed.
- **Reputation_Mode**: `"checked" | "not-requested" | "not-configured" | "budget-exhausted" | "skipped" | "failed"`, reported in `meta.reputationMode`.
- **Reputation_Outcome**: The pipeline-level record `verdict.reputation`: `{ status: "ok" | "degraded" | "not-requested"; reason?: "timeout" | "provider-error" | "invalid-response" | "rate-limited" | "too-many-links"; checkedCount: number }`.
- **Reputation_Budget**: In-memory limiter on provider calls per minute and per day, per server instance.
- **Reputation_Config**: Values read by `readReputationConfig` from the environment.
- **Consent_Box**: The unticked checkbox with its explanation text on the input form.
- **Listing_Signal**: The Signal `url.reputation-listed`.
- **Not_Listed_Note**: The neutral line shown when the check ran and nothing was listed.

## Requirements

### Requirement 1: Consent and data minimization

**User Story:** As a user, I want to decide for each scan whether my links are looked up by a third party, and to know exactly what is shared, so that I keep control of my privacy.

#### Acceptance Criteria

1. **REQ-LREP-01** WHEN a page loads, or WHEN a scan finishes (whether it succeeded or failed), THE Consent_Box SHALL be unticked. THE Consent_Box state SHALL NOT be written to localStorage, sessionStorage, IndexedDB, any cookie, or any server state.
2. **REQ-LREP-02** WHEN the client builds a request AND the Consent_Box is ticked AND the request contains at least one URL, THE client SHALL set `checkLinks: true` in the request body. IF the Consent_Box is unticked OR the request contains zero URLs, THEN THE client SHALL omit `checkLinks` from the request body.
3. **REQ-LREP-03** IF `checkLinks` is absent or `false`, THEN THE System SHALL make zero network requests to the Reputation_Provider and SHALL report Reputation_Mode `"not-requested"` in the response.
4. **REQ-LREP-04** WHEN a lookup is made, THE Reputation_Provider request SHALL contain only Hash_Prefixes and the API key. THE request SHALL NOT contain any of the following: message text, image data, a full URL, a URL path or query in any decodable form, a client key, an IP-derived value, or a cookie.
5. **REQ-LREP-05** WHEN the Reputation_Provider returns a full hash that equals the locally computed full hash of a URL_Expression of a submitted URL, THE System SHALL mark that URL as Listed. IF no returned full hash equals any locally computed full hash for that URL, THEN THE System SHALL NOT mark the URL as Listed.
6. **REQ-LREP-06** THE Consent_Box text SHALL be visible next to the checkbox before it is ticked. THE text SHALL state four things: (a) that a short fingerprint of each link is sent, not the message, (b) that the recipient is the Reputation_Provider, named, (c) that the check is optional, and (d) that the tool never opens the link.
7. **REQ-LREP-07** THE server SHALL NOT store, cache or log the URLs, URL_Expressions, hashes or provider responses of a scan. THE server SHALL NOT return them to any party other than the requester. THE server SHALL NOT retain them after the response is sent.
8. **REQ-LREP-08** THE System SHALL make Reputation_Provider calls from the server only. THE API key SHALL be read only in `src/server/reputation/reputation-config.ts` and SHALL NOT use the `NEXT_PUBLIC_` prefix.
9. **REQ-LREP-09** THE client code SHALL NOT send a network request to any host other than the app's own `/api/analyze`.

### Requirement 2: Request contract

**User Story:** As a client developer, I want one optional flag in the analyze request, so that I can ask for the lookup without a second endpoint.

#### Acceptance Criteria

1. **REQ-LREP-10** THE request schema of `POST /api/analyze` SHALL accept an optional `checkLinks` field whose value is exactly the boolean `true` or the boolean `false`, and SHALL reject any unknown top-level field.
2. **REQ-LREP-11** IF `checkLinks` is present with any value other than the boolean `true` or `false` (including `null`, `"true"`, `"false"`, `1`, `0`, an array, or an object), THEN THE Analyze_Handler SHALL respond 400 `invalid-input`, SHALL NOT run the pipeline, and SHALL NOT acquire the Reputation_Budget.
3. **REQ-LREP-12** IF the request body contains `checkLinks` but neither `text` nor `urls` satisfying REQ-API-12, THEN THE Analyze_Handler SHALL respond 400 `invalid-input`, so that `checkLinks` alone never makes a body valid.
4. **REQ-LREP-13** WHEN `checkLinks` is `true` AND a Reputation_Checker is configured AND the Reputation_Budget allows the request, THE Analyze_Handler SHALL call `createPipeline` with a `reputationChecker`.
5. **REQ-LREP-14** IF `checkLinks` is absent or `false`, OR no Reputation_Checker is configured, OR the Reputation_Budget denies the request, THEN THE Analyze_Handler SHALL call `createPipeline` without a `reputationChecker`.
6. **REQ-LREP-15** WHEN the pipeline run completes and the Analyze_Handler returns a 200 response, THE Analyze_Handler SHALL set `meta.reputationMode` to the first matching value in this order: `"not-requested"` if `checkLinks` is not `true`; `"not-configured"` if no Reputation_Checker exists; `"budget-exhausted"` if the Reputation_Budget denied the request; `"skipped"` if the pipeline analyzed zero URLs; `"failed"` if `verdict.reputation.status` is `"degraded"`; otherwise `"checked"`.
7. **REQ-LREP-16** THE Analyze_Handler SHALL acquire the Reputation_Budget at most once per request, and only at the moment the pipeline is about to call the reputation provider (lazy acquisition, as in REQ-API-48 to REQ-API-53).
8. **REQ-LREP-17** IF `checkLinks` is not `true` OR the pipeline analyzes zero URLs, THEN THE Analyze_Handler SHALL NOT acquire the Reputation_Budget.
9. **REQ-LREP-18** WHEN the Analyze_Handler emits a `LogSemanticMode` log event, THE Analyze_Handler SHALL include a `reputationMode` field whose value is one of the closed set of REQ-LREP-15 or `"none"`, and SHALL NOT include any free-form string in that field.

### Requirement 3: Lookup behavior

**User Story:** As a user, I want links checked quickly and reliably, so that the scan stays fast.

```ts
// src/core or src/analyzers (type only, no I/O)
interface ReputationHit { readonly url: string; readonly category: ReputationCategory; }
type ReputationCategory = "social-engineering" | "malware" | "unwanted-software" | "other";
type ReputationResult =
  | { status: "ok"; hits: readonly ReputationHit[]; checkedCount: number; reason?: "too-many-links" }
  | { status: "degraded"; reason: "timeout" | "provider-error" | "invalid-response" | "rate-limited" };
```

#### Acceptance Criteria

1. **REQ-LREP-19** THE Reputation_Checker SHALL return a `ReputationResult` whose `status` is `"ok"` or `"degraded"`, and SHALL NOT reject, throw or return a non-conforming value, for any input (including empty, non-string or malformed URL values) and for any provider failure.
2. **REQ-LREP-20** WHEN the Reputation_Provider receives a list of URLs, THE Reputation_Provider SHALL normalize each URL with `normalizeUrl` before hashing, SHALL skip each URL that normalizes to `null` without counting it in `checkedCount`, and SHALL send exactly one provider request per scan covering all remaining URLs.
3. **REQ-LREP-21** IF the number of Hash_Prefixes for the scan exceeds `MAX_PREFIXES_PER_REQUEST`, THEN THE Reputation_Provider SHALL include only whole URLs, taken in input order, whose Hash_Prefixes together stay within `MAX_PREFIXES_PER_REQUEST`, and SHALL return `{ status: "ok", reason: "too-many-links" }` with `checkedCount` equal to the number of URLs actually sent.
4. **REQ-LREP-22** IF the provider does not answer within `LINK_REPUTATION_TIMEOUT_MS` milliseconds, THEN THE Reputation_Provider SHALL abort the request and return `{ status: "degraded", reason: "timeout" }`.
5. **REQ-LREP-23** IF the provider answers with HTTP 429, THEN THE Reputation_Provider SHALL return `{ status: "degraded", reason: "rate-limited" }`. IF any other non-2xx status (including 5xx) or a network error occurs, THEN THE Reputation_Provider SHALL return `provider-error`. IF a 2xx body cannot be decoded (the service answers in protobuf), is longer than the response limit, or fails validation, THEN THE Reputation_Provider SHALL return `invalid-response`. In every case THE Reputation_Provider SHALL NOT retry, so one scan makes at most one provider request.
6. **REQ-LREP-24** THE Reputation_Provider SHALL map provider threat types to `ReputationCategory` through a table in a config file, and SHALL map any threat type absent from that table to `"other"`.
7. **REQ-LREP-25** WHEN a scan starts, THE pipeline SHALL run the Reputation_Checker concurrently with the text and URL analyzers. IF the Reputation_Checker has not finished within `REPUTATION_PIPELINE_TIMEOUT_MS` milliseconds, THEN THE pipeline SHALL return `{ status: "degraded", reason: "timeout" }` for the checker and SHALL continue with the other analyzers' results. `REPUTATION_PIPELINE_TIMEOUT_MS` SHALL be greater than `LINK_REPUTATION_TIMEOUT_MS`.
8. **REQ-LREP-26** THE sum of `REPUTATION_PIPELINE_TIMEOUT_MS` and `SEMANTIC_TIMEOUT_MS` SHALL be at least 2000 ms below the route `maxDuration`, and an automated test SHALL read these constants and fail when the margin is below 2000 ms.
9. **REQ-LREP-27** IF no API key is configured, THEN THE Analyze_Handler SHALL report `reputationMode` `"not-configured"`, SHALL make zero network requests to the provider, and SHALL continue the scan with the other analyzers.
10. **REQ-LREP-28** THE Reputation_Budget SHALL allow at most `LINK_REPUTATION_CALLS_PER_MINUTE` calls in any 60-second window and at most `LINK_REPUTATION_CALLS_PER_DAY` calls in any 24-hour window, measured with an injected clock. THE Reputation_Budget SHALL NOT count a denied attempt toward either limit. The default values of both limits SHALL be below the provider quota.
11. **REQ-LREP-29** IF the list of URLs is empty, or every URL normalizes to `null`, THEN THE Reputation_Checker SHALL return `{ status: "ok", hits: [], checkedCount: 0 }` and SHALL make zero network requests and consume zero Reputation_Budget calls.

### Requirement 4: Signal and score

**User Story:** As a family helper, I want a known-bad link to raise the warning clearly, so that I can tell my parent not to open it.

#### Acceptance Criteria

1. **REQ-LREP-30** WHEN a URL in the input is Listed, THE pipeline SHALL add exactly one Signal for that URL with `id: "url.reputation-listed"`, `source: "url"`, a severity read from a config constant, and evidence of the form `<host> (<category label>)`. THE evidence SHALL NOT contain the URL path, query, fragment or userinfo.
2. **REQ-LREP-31** WHEN the pipeline adds a Listing_Signal, THE pipeline SHALL pass it through `shortenEvidence` and the existing noisy-or aggregation as an ordinary Signal. THE pipeline SHALL NOT compute any score or level outside the aggregator and the combination rules.
3. **REQ-LREP-32** WHILE the Listing_Signal is present, THE combination rules SHALL give a level of at least `high`, whatever the score. THE weight, severity, overlap group and this floor SHALL be defined in `rules.config.ts` (and in `monsters.config.ts` if they affect monster choice) and SHALL NOT be hard-coded elsewhere.
4. **REQ-LREP-33** WHILE the Listing_Signal is present, THE awareness adjustment SHALL leave the level unchanged. WHILE the Listing_Signal is absent, THE awareness adjustment SHALL keep its current rule that only a `high` level may be lowered, by one step.
5. **REQ-LREP-34** IF the reputation result is `degraded` or the URL is not Listed, THEN THE pipeline SHALL add no reputation signal. THE level, score, monster, actions and signals SHALL then be identical to those of a run with no checker.
6. **REQ-LREP-35** THE `Verdict` SHALL include a field `reputation` of type Reputation_Outcome. WHEN a run has no checker, THE pipeline SHALL set `reputation` to `{ status: "not-requested", checkedCount: 0 }`.
7. **REQ-LREP-36** THE system SHALL include `url.reputation-listed` in `KNOWN_SIGNAL_IDS` (`src/ui/i18n/signal-ids.ts`) and in the pipeline's allowed signal ids. THE existing signal-id consistency tests SHALL pass with zero failures.
8. **REQ-LREP-37** WHEN the Listing_Signal is present, THE pipeline SHALL add the limitation key for "this list covers only reported sites" to the verdict `limitations` exactly once. THE key SHALL be taken from `messages.config.ts`.
9. **REQ-LREP-38** IF a run contains more than one Listed URL, THEN THE pipeline SHALL add one Signal per distinct Listed host, and THE aggregator SHALL combine them through the same overlap-group rule as other signals. THE level SHALL still satisfy the floor of REQ-LREP-32.

### Requirement 5: Graceful degradation and wording

**User Story:** As a less tech-savvy user, I want a calm note when the check could not run or found nothing, and never be told a link is safe.

#### Acceptance Criteria

1. **REQ-LREP-39** IF Reputation_Mode is `"failed"`, `"budget-exhausted"` or `"not-configured"`, THEN THE UI SHALL show exactly one neutral notice (for example "We could not check links against the lists this time. The other checks still ran.") AND SHALL still show the full result, including the level label, the evidence list and the next-action text, unchanged from the result shown without a reputation check.
2. **REQ-LREP-40** WHEN Reputation_Mode is `"checked"` AND no Listing_Signal is present, THE UI SHALL show exactly one Not_Listed_Note consisting of the sentence "Not found on the lists we checked" followed by one limit sentence stating that new and unreported links are not on any list yet.
3. **REQ-LREP-41** THE UI SHALL NOT include any word of the `safe` family (REQ-UI-06) in the Not_Listed_Note or in any reputation text.
4. **REQ-LREP-42** WHILE Reputation_Mode is `"checked"`, `"failed"`, `"budget-exhausted"` or `"not-configured"`, THE UI SHALL keep `verdict.level` and the level label identical to the values produced without the reputation text.
5. **REQ-LREP-43** IF Reputation_Mode is `"skipped"` or `"not-requested"`, THEN THE UI SHALL NOT show the Not_Listed_Note and SHALL NOT show any reputation notice.
6. **REQ-LREP-44** WHEN `verdict.level` is `no_signals` AND the Not_Listed_Note is shown, THE UI SHALL show the level label "Nothing detected yet" AND SHALL apply the strong reminder rules of `ui-page` unchanged.
7. **REQ-LREP-45** THE UI SHALL write every new reputation text key so that it follows the link wording rule (REQ-LINK-06, REQ-PAGE-45): none of the words "fake", "malicious" or "dangerous" stated as a fact, at most 25 words per sentence, tier C.
8. **REQ-LREP-46** WHERE a Listing_Signal is present for a link, THE UI SHALL describe that link with "has traits of" or "appears on a list of reported sites" wording.
9. **REQ-LREP-47** THE Vietnamese reputation texts SHALL be treated as drafts, AND THE tests SHALL NOT assert their exact wording.
10. **REQ-LREP-48** THE UI SHALL NOT include in any reputation notice any provider error text, HTTP status code, API key or URL.
11. **REQ-LREP-49** THE UI SHALL name the provider in the Consent_Box and in the Listed explanation (for example "a list kept by Google Safe Browsing"), as the provider's terms of use require attribution; the exact attribution text is defined in the open points.

### Requirement 6: Link creature and result UI

**User Story:** As a young professional, I want a listed link to get its own creature and clear evidence, so that I can learn what a reported link looks like.

#### Acceptance Criteria

1. **REQ-LREP-50** THE `LINK_CREATURES` table SHALL contain exactly eight entries, with the following entry at index 7 (last position): signal `url.reputation-listed`, id `plague-mark`, English name "Plague Mark", tone `strong`, color token `link-plague-mark`, art key `creature-plague-mark`, and the same key families as the other seven creatures (`link.plague-mark.name`, `.desc`, `.tip1`, `.tip2`, `.tip3`). The first seven entries SHALL remain unchanged in content and order.
2. **REQ-LREP-51** THE `link-plague-mark` token SHALL exist in both the normal and the high-contrast palette. In each palette its value SHALL differ from each of the seven other link tokens. THE contrast ratio of `text` on `surface` and of `text` on `raised` SHALL be at least 4.5:1 in the normal palette and at least 7:1 in the high-contrast palette. Two pairs SHALL be added to `DECLARED_PAIRS`.
3. **REQ-LREP-52** THE `creature-plague-mark` art SHALL be an inline SVG authored for this project, registered under its own `artKey` that no other creature uses, and containing no external resource reference. THE art budget test SHALL pass with each art file at most 30 KB and all art files together at most 350 KB.
4. **REQ-LREP-53** WHEN the Listing_Signal is present in the result, THE result UI SHALL show it as one signal card in the `url` group. THE card SHALL contain the explanation text for key `signal.url.reputation-listed.explain`, the evidence defined for the Listing_Signal, and the severity text.
5. **REQ-LREP-54** WHEN the Listing_Signal is present in the result, THE Link_Spotlight SHALL show the Plague Mark badge exactly once.
6. **REQ-LREP-55** WHEN the reputation notice or the Not_Listed_Note is shown, THE result UI SHALL place it inside the Link_Spotlight area if a creature exists, and otherwise directly after the Level_Banner with no other element between them. THE notice and the Not_Listed_Note SHALL be plain text containing zero `<a` elements and no `href` or `onClick` attribute. THEIR font sizes SHALL use only `rem` units, and THEIR text and background colors SHALL come only from pairs in `DECLARED_PAIRS`.
7. **REQ-LREP-56** THE `buildResultView` function SHALL return a result for every input and SHALL NOT throw. THE function SHALL derive the reputation notice and the Not_Listed_Note only from `verdict.reputation` and `meta.reputationMode`.
8. **REQ-LREP-57** IF `verdict.reputation` or `meta.reputationMode` is missing, or has a value outside its declared type, THEN `buildResultView` SHALL return a view with no reputation notice and no Not_Listed_Note, and the rest of the view SHALL be identical to the view produced when both fields are absent.
9. **REQ-LREP-58** THE Consent_Box SHALL be a checkbox with a visible label, reachable with the Tab key and toggled with the Space key. THE explanation text SHALL be linked to the checkbox through `aria-describedby`. THE checkbox target SHALL be at least 2.75rem wide and 2.75rem high, declared in `rem` units. THE checkbox SHALL be unchecked on initial render and on every page load.

### Requirement 7: Configuration and documentation

**User Story:** As an operator, I want the feature tunable and documented, so that I can switch it off or adjust it without code changes.

#### Acceptance Criteria

1. **REQ-LREP-59** THE `readReputationConfig(env)` function in `src/server/reputation/reputation-config.ts` SHALL be the only code that reads `LINK_REPUTATION_API_KEY`, `LINK_REPUTATION_TIMEOUT_MS`, `LINK_REPUTATION_CALLS_PER_MINUTE` and `LINK_REPUTATION_CALLS_PER_DAY`.
2. **REQ-LREP-60** WHEN `readReputationConfig` is called, THE function SHALL validate each setting with zod and return a config object without throwing for any input, including a missing `env` value, a missing setting, a blank setting (empty or whitespace only), a non-string value, or a string that is not a base-10 integer made only of the digits 0 to 9.
3. **REQ-LREP-61** IF a numeric setting is missing, blank, non-string or not a base-10 integer made only of the digits 0 to 9, THEN THE function SHALL return that setting's default: timeout 3000 ms, calls per minute 10, calls per day 2000.
4. **REQ-LREP-62** IF a numeric setting is a valid base-10 integer outside its range, THEN THE function SHALL clamp it to the nearest bound: timeout 500 to 6000 ms, calls per minute 0 to 60, calls per day 0 to 10000.
5. **REQ-LREP-63** IF `LINK_REPUTATION_API_KEY` is missing, blank or not a string, THEN THE function SHALL return a result that means "not configured". IF calls per minute or calls per day is 0 after clamping, THEN THE function SHALL return a result that means the feature is off. In both cases the Reputation_Provider SHALL send no lookup request.
6. **REQ-LREP-64** THE `.env.example` file SHALL list the four settings with placeholder values (no real key) and, for each setting, a comment stating its unit, its default and bounds (where numeric), and its privacy effect.
7. **REQ-LREP-65** THE `README.md` file SHALL document the feature, the consent rule, what data is sent to the provider, the statement that "not listed" is not "safe", the `checkLinks` request field, and each `reputationMode` value.
8. **REQ-LREP-66** THE following steering files SHALL be updated in the same change as the feature code, using the wording fixed in `design.md`: `privacy-and-safety.md` (core commitment, data-flow rule 6 for the reputation exception with its four conditions, dependency hygiene, and a row for the reputation wording); `product.md` (the "done" line gets "except the consented link lookup of `link-reputation-check`"); `tech.md` (the four new environment variables); `api-rules.md` (reputation settings read only in `reputation-config.ts`; URLs and hashes never logged); `verdict-rules.md` (the awareness exception does not apply to a Listing_Signal, and the floor is a combination rule).
9. **REQ-LREP-67** THE Reputation_Provider module SHALL import nothing from `src/pipeline`, `src/ui`, `src/components` or browser-only packages.
10. **REQ-LREP-68** THE modules under `src/pipeline`, `src/core`, `src/analyzers`, `src/ui` and `src/client` SHALL import nothing from `src/server/reputation`.

## Existing Requirements and Tests Modified

This feature changes frozen contracts on purpose. Nothing else in the existing specs is changed.

| Existing item | Change |
|---|---|
| `privacy-and-safety.md` core commitment and data-flow rules | Narrow, conditional exception (REQ-LREP-66) |
| `product.md` principle 3 and "done" list | Same exception, named |
| REQ-API-11 (strict schema `{ text, urls, locale }`) | Gains optional `checkLinks` (REQ-LREP-10, 11) |
| REQ-API-14 / 15 (`meta`) | `meta` gains `reputationMode` (REQ-LREP-15) |
| REQ-API-04 and REQ-API-46 (`createPipeline` options) | May also carry `reputationChecker` (REQ-LREP-13) |
| REQ-API-37 / 57 and `AnalyzeLogEvent` | Gains `reputationMode` (REQ-LREP-18) |
| REQ-API-36 (no `NEXT_PUBLIC_`) and REQ-API-33 (only `api-config.ts` reads settings) | Reputation settings are read in their own config file (REQ-LREP-59) |
| `analysis-pipeline` (pipeline inputs and `Verdict`) | `PipelineOptions` gains optional `reputationChecker`; `Verdict` gains `reputation` (REQ-LREP-35) |
| `analyze-api` "Out of scope: caching" and "no third party" intent | The lookup is not cached (REQ-LREP-07) |
| REQ-CI-61, REQ-CI-62, REQ-CI-63 (`client-ingest`) | Body keys become `text`, `urls`, `locale`, `checkLinks`; the client reads `reputationMode` |
| REQ-LINK-01 to REQ-LINK-04 | Seven creatures become eight; tone count `strong` x5, `medium` x1, `soft` x2 |
| REQ-LINK-03 test (ids read from `url-analyzer.ts`) | The set test now also reads the checker's signal id from its own module |
| REQ-LINK-15 / 16 | Eight tokens; 16 declared pairs |
| `awareness.ts` | Does not lower with a Listing_Signal (REQ-LREP-33) |
| `UrlAnalyzer` | NOT changed. It stays offline (REQ-URL-27 to 30) |
| `ui-page` REQ-PAGE-23 | New Consent_Box in the input form; notices in the result (REQ-LREP-55) |

Tests edited only where they pin the creature count, the token set, the `meta` shape, the request keys or the privacy text. New files carry their own tests.

## Property-Based Testing Requirements

Continues after PBT-115. `numRuns >= 100`. All provider tests use `FakeReputationProvider`; handler tests use fake clocks, a counting fake budget and `new Request(...)`.

| ID | Property | Generator hint |
|---|---|---|
| **PBT-116** | The Reputation_Checker never throws or rejects, and always returns a conforming `ReputationResult`, for arbitrary URL arrays (including empty, non-string and all-malformed arrays, which give `{ status: "ok", hits: [], checkedCount: 0 }` with zero provider calls) and for a provider that throws, hangs, or returns arbitrary bytes or JSON; each failure maps to the reason of REQ-LREP-23 and no request is retried (REQ-LREP-19, 23, 29) | `fc.array(fc.string())`, `fc.anything()` as provider response, throwing and never-resolving fakes |
| **PBT-117** | Privacy: for arbitrary URLs and texts, every outbound provider request body, URL and header contains no input text, no full URL, no path or query, and only 4-byte Hash_Prefixes that equal the SHA-256 prefix of a URL_Expression; no log event or response contains a URL or hash (REQ-LREP-04, 07) | Marker strings in text, path and query; capture fake `fetch` |
| **PBT-118** | Without `checkLinks: true` (absent or `false`) the provider is called zero times, the budget is never acquired, `reputationMode` is `"not-requested"`, and the verdict signals, level and score equal a run with no checker (REQ-LREP-03, 16, 17, 34) | Valid bodies, `fc.constantFrom(undefined, false)` |
| **PBT-119** | `checkLinks` accepts only `true` and `false`: any other value, or a body with `checkLinks` but neither `text` nor `urls`, gives 400 `invalid-input` without running the pipeline or acquiring the budget; a valid body with either value never gives 400. The handler never throws, and error bodies are exactly `{ error: { code } }` (REQ-LREP-10 to 12) | `fc.anything()`, `fc.constantFrom("true", "false", 1, 0, null, "", [], {})` |
| **PBT-120** | Listed means full-hash equality: for arbitrary provider answers (random prefix matches, wrong full hashes, extra hashes) and arbitrary URL sets including several URLs on the same or different hosts, a URL gets a Listing_Signal if and only if a returned full hash equals the full hash of one of its URL_Expressions, and there is exactly one Listing_Signal per distinct Listed host, with evidence free of path, query, fragment and userinfo (REQ-LREP-05, 30, 38) | Fake provider with generated hash sets |
| **PBT-121** | Score ownership: for any verdict inputs and any checker result, `riskScore` and `level` equal `aggregate` plus `applyRules` of the final signal list; a `degraded` or all-not-listed result gives the same `riskScore`, `level`, `monster`, `signals` and `actions` as a run with no checker; a Listing_Signal never lowers a level and gives a level of at least `high`, also with several Listed hosts (REQ-LREP-31 to 34, 38) | Signal arbitraries as in `pipeline.property.test.ts`, checker results |
| **PBT-122** | Awareness: for any verdict with a Listing_Signal, the awareness adjustment never lowers `level` or `riskScore`; without it, only `high` may be lowered, by one step (REQ-LREP-33) | Awareness arbitrary of `awareness.property.test.ts` plus the Listing_Signal |
| **PBT-123** | Reputation_Mode derivation follows the order of REQ-LREP-15 for arbitrary combinations of flag, config presence, budget decision, URL count and checker status; the logged mode equals `meta.reputationMode` on a 200 and is `"none"` on every earlier exit (REQ-LREP-15, 18) | Combinations via `fc.record` |
| **PBT-124** | Budget: successful acquisitions never exceed the per-minute and per-day limits for arbitrary time deltas, and denied attempts are not counted; `tryAcquire` is called at most once per request and zero times when `checkLinks` is not true or no URL is analyzed; a denied or throwing budget yields 200 with the rule-based verdict and no checker passed (REQ-LREP-14, 16, 17, 28) | `fc.array` of deltas, small limits, throwing budget |
| **PBT-125** | Timeouts: a checker that never answers yields `degraded` with `timeout` within `REPUTATION_PIPELINE_TIMEOUT_MS` (fake timers) and the scan still returns a verdict; the timeout constants satisfy REQ-LREP-25 and REQ-LREP-26 (REQ-LREP-22, 25, 26) | Fake timers, hanging fake |
| **PBT-126** | `readReputationConfig` never throws for arbitrary env objects, every number is an integer within its bounds (default for non-decimal input, clamp for out-of-range decimals), and a missing or blank key means "not configured" (REQ-LREP-59 to 63) | `fc.dictionary`, `fc.anything()`, huge and non-numeric strings |
| **PBT-127** | View: for arbitrary verdicts and `reputationMode` values (including garbage), `buildResultView` never throws; the Not_Listed_Note appears only for `"checked"` with no Listing_Signal; the notice appears only for `failed`, `budget-exhausted` or `not-configured`; level, score, monster and actions equal those of a view with no reputation data; a missing or malformed field gives a view identical to the one with both fields absent (REQ-LREP-39 to 44, 56, 57) | Verdict arbitrary of PBT-65 plus `fc.anything()` for `reputationMode` |
| **PBT-128** | Dictionaries: every new reputation key exists in both languages with equal placeholders, matches none of the wording regexes (`/\b(fake\|malicious\|dangerous)\b/i`, `/giả mạo\|độc hại\|nguy hiểm/i`), contains no word of the `safe` family, has sentences of at most 25 words, and is tier C (REQ-LREP-41, 45 to 47) | `fc.constantFrom` over keys and languages |
| **PBT-129** | Round trip of the request: `buildAnalyzeRequest` sets `checkLinks` only to `true` and only when the input has a URL and the flag is `true`; the result is accepted by the real request parser; any other input never produces `checkLinks` (REQ-LREP-02, 10) | `fc.anything()`, valid inputs |
| **PBT-130** | Contrast and creature table: the `plague-mark` pairs meet 4.5 and 7; the eight tokens are pairwise different in each palette; the set of `signalId` values equals the ids emitted by `UrlAnalyzer` plus `url.reputation-listed` (REQ-LREP-50, 51) | `fc.constantFrom` over the new pairs |

### Example-based tests

- `checkLinks: true` with a Listed URL (fake provider): verdict has one `url.reputation-listed` signal, level at least `high`, `reputationMode: "checked"`, and the Plague Mark badge is shown.
- `checkLinks: true`, no key: 200, `"not-configured"`, notice shown, same verdict as without the flag.
- Provider returns 429 or times out: 200, `"failed"`, neutral notice, no signal.
- Provider checked and no match: Not_Listed_Note shown, the word "safe" appears nowhere, level label unchanged.
- Text with no URL and `checkLinks: true`: `"skipped"`, no provider call, no note.
- The outbound request fixture contains only 4-byte prefixes (hex or base64 of 4 bytes) and the key.
- Consent_Box is unticked after a scan, and is not found in `localStorage`, `sessionStorage` or cookies.
- `.env.example` and `README.md` contain the four variables and the privacy paragraph; `privacy-and-safety.md` contains the exception text.
- A scan with more links than `MAX_PREFIXES_PER_REQUEST` sets `reason: "too-many-links"` and `checkedCount` equal to the number of whole URLs sent (REQ-LREP-21).
- `checkLinks: true` with an empty URL list or only malformed URLs: provider called zero times, budget acquired zero times (REQ-LREP-29).
- Two Listed URLs on different hosts: two Listing_Signals, one `limitations` entry for the list coverage, level at least `high` (REQ-LREP-37, 38).
- `checkLinks` given as `"true"`, `1`, `null` or `[]`: 400 `invalid-input`; body with only `checkLinks`: 400 `invalid-input` (REQ-LREP-11, 12).

## Out of Scope

Local blocklist download or sync (the Safe Browsing Update API), VirusTotal or
other providers (the adapter interface allows them later), checking links that
are not in the scan, following redirects or fetching the page, caching or
storing results, a stored "always check" setting, sending text or images to the
provider, analytics on lookups, reputation for QR or image content other than
through the URLs already extracted, and any change to `UrlAnalyzer`.

## Non-Functional Requirements

- **NFR-LREP-01** The Reputation_Provider and the pipeline hold no state across requests except the in-memory Reputation_Budget counters, and keep no URL, hash or response after the response is sent.
- **NFR-LREP-02** A failing, slow or missing provider never changes the HTTP status: the response stays 200 with the rule-based verdict.
- **NFR-LREP-03** Added server work per request is bounded: one provider request, at most `MAX_PREFIXES_PER_REQUEST` prefixes, one timeout.
- **NFR-LREP-04** Limits, severities, category labels, the category table and timeouts live in config files and are editable without touching logic or its tests.
- **NFR-LREP-05** The feature adds no new browser dependency. A server-side HTTP call uses the platform `fetch`; a new server dependency needs justification in `design.md`.

## Assumptions and Open Points

Assumptions made, to be confirmed in `design.md`:

1. **Provider and API.** Default is the Google Safe Browsing API v5 `hashes.search` with 4-byte prefixes, called statelessly without a local database. The design phase must check the current documentation for the exact endpoint, prefix limits per request, key handling and quota.
2. **Consent per use**, not a stored setting (REQ-LREP-01). A stored opt-in is possible later but needs a spec change.
3. **Floor of `high`** for a Listed link (REQ-LREP-32). Whether a listed link alone should be `critical` is open; the weights decide.
4. **Creature name** "Plague Mark" is a placeholder; the name and the Vietnamese texts are drafts for review.
5. **Attribution and terms.** The provider's terms (attribution wording, allowed use, any non-commercial limit for the public API, and any rule against showing "not listed" as a verdict) must be checked before release. The "not found on the lists we checked" wording was chosen to fit, but this is not legal advice.
6. **Prefix privacy is partial.** A 4-byte prefix can match many URLs, which hides the exact link, but the server IP and the timing are visible to the provider. The Consent_Box text must not say the lookup is anonymous.
7. **Short links.** The lookup checks the short link itself and does not follow the redirect (out of scope), so a listed destination behind a shortener is not found.
8. **Concurrency with the LLM.** Reputation runs in parallel with the rule analyzers and before the semantic policy decision, so a Listed link that makes the rules `critical` skips the LLM under `when-not-critical`.
9. **`Verdict.reputation` and `meta.reputationMode` both exist** because the pipeline cannot see budget or configuration (server concerns), as with `semantic` and `semanticMode`.
10. **Monster choice** for a Listed link is left to `monsters.config.ts` weights; no new monster is added.
11. **Hosting.** In-memory budget is per instance and best effort on serverless, like the LLM budget.
