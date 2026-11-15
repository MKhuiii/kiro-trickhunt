# Requirements Document

## Introduction

The first real TrickHunt page: input (text and image), progress, result, errors
and display settings, built on the finished `ui-presentation` layer
(`src/ui/`), the client ingest API (`src/client/ingest`) and `POST /api/analyze`.
It replaces the placeholder `src/app/page.tsx`. The temporary `src/app/try/page.tsx`
is left untouched.

The spec also records three presentation rules learned from real results:

1. A `suspicious` result must read calm. The primary content of a result is the
   level, the "What to do now" box and the evidence. The monster is secondary
   because its type can be imperfect.
2. When the extra AI check did not run, the page says so prominently, and a
   result with no warning signs carries a stronger reminder.
3. A short limits note is always visible next to the result.

Numbering: new `REQ-PAGE-` series, `PBT-75` onward (last existing is `PBT-74`).

## Relationship to existing specs

`ui-presentation` is complete and its tasks are checked, so it is not reopened.
This spec **amends** it through an explicit, small group of changes to
`src/ui/` (Requirements 1 to 3 and the tasks in group 1). Everything else in
`src/ui/` is reused as is. The amended items:

| Existing item | Change made by this spec |
|---|---|
| `level.suspicious` (en/vi) | New calm wording |
| `result.actions.heading` | Reads "What to do now" |
| REQ-UI-16 (monster choice) | `suspicious` always uses `generic` |
| `ReadyResultView` | New fields `aiNote`, `limitsNoteKey`; `noSignals.reminderKey` can be the strong variant |
| `WithheldResultView` | New field `limitsNoteKey` |
| `privacy-and-safety.md` risk-level table | Row `suspicious` gets the new wording (steering edit, see Open points) |

**Hard constraints** (unchanged from `ui-presentation` and `ui-rules.md`):

- No change to `src/core`, `src/analyzers`, `src/pipeline`, `src/server`,
  `src/app/api` or the `POST /api/analyze` contract.
- No result is ever called "safe" / "an toàn" (the one negated key excepted).
- Risk is never conveyed by color alone: text label and icon always.
- Every user-visible string is a dictionary key in `en` and `vi` with identical
  key sets. No hard-coded text in components. English is the default.
- Images never leave the browser; only text and http(s) URLs reach the server.
- No third-party runtime requests, no new dependency, no analytics.
- Browser storage only through `src/ui/preferences.ts`.
- View logic is pure and tested in `src/ui/`; components stay thin, live in
  `src/components/` (PascalCase `.tsx`) and `src/app/`, and receive dependencies
  as props.

## Glossary

- **Level_Banner**: The component block showing the level label, level icon and risk meter.
- **Action_Box**: The "What to do now" block listing `verdict.actions`.
- **Evidence_List**: The grouped signal cards and the highlighted message.
- **AI_Note**: The prominent note shown when the extra AI (semantic) check was not available.
- **Limits_Note**: The always-visible sentence saying the tool cannot prove a message is genuine.
- **Strong_Reminder**: The `no_signals` reminder used when the AI_Note is shown.
- **Technical_Details**: The collapsed section with the semantic mode note, error codes and similar.
- **Page_State**: `idle | working | done | failed` plus the data each carries.

## Requirements

### Requirement 1: Level presentation

**User Story:** As someone who got a mildly odd message, I want a calm result, so that I check it without panicking.

#### Acceptance Criteria

1. **REQ-PAGE-01** THE English label of `level.suspicious` SHALL be "A few things to double-check". The labels of `high` and `critical` MAY stay stronger ("Multiple warning signs, be cautious", "Strong indicators of a scam"). The `vi` label SHALL be a draft with the same meaning.
2. **REQ-PAGE-02** FOR level `suspicious`, THE `LEVEL_PRESENTATION` entry SHALL NOT use `icon-stop`, and its `colorToken` SHALL NOT be a red or pink hue. A test SHALL compute the hue of `level-suspicious` in both palettes and reject the range 340° to 20°, and SHALL check that `icon-stop` belongs only to `critical`.
3. **REQ-PAGE-03** FOR level `suspicious`, THE monster in the view SHALL always be `generic` (Odd Shadow), whatever `verdict.monster` says. For `high` and `critical`, the monster is `verdict.monster` when known, else `generic`. For `no_signals` it stays `neutral`. *(Amends REQ-UI-16.)*
4. **REQ-PAGE-04** THE page SHALL give the Level_Banner, the Action_Box and the Evidence_List visual priority, in that order, over the monster. The monster block SHALL be a secondary card placed after the Evidence_List, with no larger heading than the Evidence_List heading. The monster name SHALL NOT appear in the Level_Banner or in the announcement.
5. **REQ-PAGE-05** THE Action_Box heading key `result.actions.heading` SHALL read "What to do now" in English. The box SHALL be shown for every ready view that has at least one action, and SHALL come before the Evidence_List.
6. **REQ-PAGE-06** NO text for `suspicious` (label, announcement, summary) SHALL contain "scam", "dangerous", "stop" or "malicious", in either language's dictionary keys used for that level. (`high` and `critical` are not restricted.)

### Requirement 2: AI-layer note

**User Story:** As a user, I want to know when the smart check did not run, so that I do not over-trust a quiet result.

#### Acceptance Criteria

1. **REQ-PAGE-07** THE view model SHALL have `aiNote: { key: "result.aiNote.unavailable" } | null`. It is non-null exactly when `semanticMode` is `budget-exhausted` or `not-configured`, OR `verdict.semantic.status` is `degraded`, OR `verdict.semantic.status` is `unavailable` with no `semanticMode` (the same case REQ-UI-20 maps to `not-configured`). It is `null` for modes `used` and `skipped` and for status `ok`.
2. **REQ-PAGE-08** THE English text of `result.aiNote.unavailable` SHALL be: "The extra AI check was not available, so this result may miss newer or unusual scams. Treat unexpected requests with care." The `vi` text is a draft with the same meaning.
3. **REQ-PAGE-09** THE page SHALL render the AI_Note directly under the Level_Banner (before the Action_Box), outside Technical_Details, as a visible block with an icon and the text, with `role="note"`. It SHALL NOT depend on color alone and SHALL NOT be collapsible or dismissible.
4. **REQ-PAGE-10** FOR level `no_signals`, WHEN `aiNote` is non-null, THE `noSignals.reminderKey` SHALL be `result.noSignals.reminderStrong`; otherwise it SHALL stay `result.noSignals.reminder`. The strong text SHALL say the check was weaker, tell the reader not to rely on the quiet result, and point to calling the official number. Neither text may contain "safe" or "an toàn".
5. **REQ-PAGE-11** THE existing `semanticNoteKey` line SHALL remain, but only inside Technical_Details. It is a detail, not the warning.
6. **REQ-PAGE-12** THE AI_Note SHALL also be shown for a `withheld` result when the page knows the mode is one of the AI-unavailable cases. *(Page-level rule; the withheld view only adds `limitsNoteKey`.)*

### Requirement 3: Limits note

**User Story:** As any user, I want a plain reminder of what this tool cannot do.

#### Acceptance Criteria

1. **REQ-PAGE-13** THE dictionary SHALL contain `result.limitsNote`, English: "TrickHunt looks for warning signs. It cannot prove that a message is genuine." Both `ReadyResultView` and `WithheldResultView` SHALL expose `limitsNoteKey: "result.limitsNote"`.
2. **REQ-PAGE-14** THE page SHALL show the Limits_Note whenever a result or a withheld result is shown, as visible body-size text (not smaller than the surrounding text, not collapsed, not in a tooltip), after the Evidence_List and before the monster card.
3. **REQ-PAGE-15** THE `verdict.limitations` strings SHALL still be shown under a "Good to know" heading; the Limits_Note does not replace them.

### Requirement 4: Page structure and flow

**User Story:** As a family helper, I want one simple page: paste or upload, press Check, read the answer.

#### Acceptance Criteria

1. **REQ-PAGE-16** `src/app/page.tsx` SHALL render a single page with, in order: skip link, header (name, tagline, settings), privacy note, input form, status area, result area. Semantic landmarks (`header`, `main`, `form`, `section`) and one `h1` SHALL be used.
2. **REQ-PAGE-17** THE input form SHALL have a labelled textarea, a labelled image file input (accept `image/png,image/jpeg,image/webp`), drag-and-drop and paste of an image, a "remove image" control, a Check button and, after a result, a "Check another message" button that clears text, image and result.
3. **REQ-PAGE-18** THE Check button SHALL be disabled while working. WHEN there is no text and no image, pressing it SHALL show `input.empty` and SHALL NOT call ingest or the API.
4. **REQ-PAGE-19** THE page SHALL reuse `ingestImage`, `buildAnalyzeRequest`, `analyzeRequest` and `createBrowserIngestDeps` from `src/client/ingest`, and SHALL pass `locale` from the current language to `buildAnalyzeRequest`. The ingest module is loaded only when an image was chosen.
5. **REQ-PAGE-20** THE flow SHALL be implemented by a pure function `runCheck(deps, input, onStatus)` in `src/ui/run-check.ts` that takes the three client functions as injected dependencies, never throws, and returns a `CheckOutcome` (`nothing` | `failed` with a `MessageRef` | `done` with `verdict`, `inputText`, `extras`). Components only call it and render its outcome.
6. **REQ-PAGE-21** THE page SHALL show progress through an element with `role="status"` and `aria-live="polite"` using the `progress.*` keys, and SHALL move focus to the result heading when a result is ready.
7. **REQ-PAGE-22** ERRORS (ingest error, API error, unexpected) SHALL be shown with the `MessageRef` text in an element with `role="alert"`, with the code only inside Technical_Details. WHEN ingest fails but the user also typed text, the page SHALL continue with the text and show the ingest message as a notice.
8. **REQ-PAGE-23** THE result area SHALL show, in this order: heading; Level_Banner (label, icon, meter text "x out of 100", meter bar); AI_Note (if any); Action_Box; Evidence_List (signal cards with source group heading, explanation, short evidence, severity text; the message with highlighted spans in `<mark>` with screen-reader prefix); Limits_Note; limitations; monster card (secondary); notices; Technical_Details.
9. **REQ-PAGE-24** FOR a `withheld` view, THE page SHALL show `result.withheld`, the notices and the Limits_Note, and SHALL NOT show a level or monster.
10. **REQ-PAGE-25** THE neutral state SHALL show the summary, the not-genuine note and the reminder (strong variant when `aiNote` is non-null). It SHALL show the `neutral` monster card in the secondary position.

### Requirement 5: Settings

**User Story:** As an older reader, I want bigger text and higher contrast, and I want the app to remember them.

#### Acceptance Criteria

1. **REQ-PAGE-26** THE settings area SHALL offer language (English, Tiếng Việt), text size (100, 125, 150), reduce motion and high contrast, bound to `loadPreferences` / `savePreference` and `getBrowserStorage` only. The first render SHALL use defaults (language `en`) and apply saved values after mount, so server and client markup match.
2. **REQ-PAGE-27** TEXT size SHALL be applied as a percentage on the root font size and all sizes SHALL be in `rem`/`em` (no fixed-pixel font sizes on user-facing text).
3. **REQ-PAGE-28** THE theme SHALL be applied through CSS custom properties generated by a pure function `paletteToCssVars(palette)` in `src/ui/theme/css-vars.ts` (one variable per `ColorToken`, from `NORMAL_PALETTE` or `HIGH_CONTRAST_PALETTE`). Tailwind utility classes read these variables; no color literal is repeated in components.
4. **REQ-PAGE-29** CHANGING the language SHALL re-render all dictionary text at once. `verdict.actions` and `verdict.limitations` keep the request language (known limitation of `ui-presentation`); the page SHALL NOT re-run the analysis.

### Requirement 6: Accessibility

#### Acceptance Criteria

1. **REQ-PAGE-30** EVERY control SHALL have a visible label, be keyboard operable, and show a visible focus ring using the `focus` token.
2. **REQ-PAGE-31** THE page SHALL work with `prefers-reduced-motion` and with the "reduce motion" setting: no animation runs when either is on, and nothing flashes in any case.
3. **REQ-PAGE-32** THE level SHALL be conveyed by label text and icon as well as color; the meter SHALL have a text equivalent (`result.meter.label`).
4. **REQ-PAGE-33** `Technical_Details` SHALL use `<details>` (collapsed by default) and be the only place that shows codes, ids or JSON.
5. **REQ-PAGE-34** ALL used color pairs SHALL come from `DECLARED_PAIRS`; any new pair introduced by this spec (AI_Note, Limits_Note, settings) SHALL be added there and pass the existing thresholds in both palettes.

### Requirement 7: Privacy and boundaries

#### Acceptance Criteria

1. **REQ-PAGE-35** NO user text, image, OCR text, URL or evidence SHALL be stored, logged (`console.*`), put in a URL, or placed in storage. A test SHALL scan `src/components/` and `src/app/page.tsx` for `console.`, `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `history.pushState`/`replaceState` and `location.hash`/`search` assignments.
2. **REQ-PAGE-36** THE only network call SHALL be the same-origin analyze call inside `analyze-client.ts`. Components SHALL NOT call `fetch`, and SHALL NOT load external fonts, images or scripts. Fonts, if any, are self-hosted at build time.
3. **REQ-PAGE-37** `src/client/ingest/boundaries.test.ts` SHALL also scan `src/components/` and `src/app/page.tsx` for the existing checks (no `server/` import, no CDN, `fetch(` only in `analyze-client.ts`, no storage). The rule "import type only from `src/pipeline`" applies to them as well.
4. **REQ-PAGE-38** `src/ui/` stays free of `react`, `next`, `window`, `document`, `navigator`, `process`. React code lives only in `src/components/` and `src/app/`.
5. **REQ-PAGE-39** EVERY user-visible string in `src/components/` and `src/app/page.tsx` SHALL come from `t(...)`. A test SHALL scan the JSX text nodes and string attributes (`aria-label`, `title`, `placeholder`, `alt`) for literal English words and fail on any.

## Property-Based Testing Requirements

`numRuns >= 100`. Verdicts are valid as in `ui-presentation` (non-`no_signals`
has at least one signal).

| ID | Property |
|---|---|
| **PBT-75** | For any valid verdict with level `suspicious`, any monster value and any extras, `buildResultView` returns `state: "monster"` with monster `generic`; the resolved level label, announcement and summary texts in both languages contain none of the REQ-PAGE-06 words; `LEVEL_PRESENTATION.suspicious.iconKey` is not `icon-stop` |
| **PBT-76** | For any verdict and extras (`semanticMode` from the four values or `undefined`, `semantic.status` from three values, any reason), `aiNote !== null` exactly when the REQ-PAGE-07 condition holds; it never depends on level, signals or text |
| **PBT-77** | For any valid `no_signals` verdict, `noSignals.reminderKey` is `result.noSignals.reminderStrong` exactly when `aiNote !== null`; resolved texts of both reminder keys, in both languages, never contain `safe` or `an toàn`; the strong text differs from the normal text |
| **PBT-78** | `runCheck` with arbitrary fake deps (throwing, rejecting, returning junk, slow progress) never throws or rejects; the request passed to the injected `analyzeRequest` never contains image data (only `text` and `locale`); with empty input it makes no dependency call and returns `nothing` |
| **PBT-79** | `paletteToCssVars` returns exactly one `--th-<token>` entry per `ColorToken`, every value is the palette value, and the key set is identical for both palettes |
| **PBT-80** | Dictionary: the new keys (`result.aiNote.unavailable`, `result.noSignals.reminderStrong`, `result.limitsNote`) exist in both languages with equal placeholders; every sentence has at most 25 words |

### Example-based tests

- English `level.suspicious` equals "A few things to double-check"; `result.actions.heading` equals "What to do now".
- A `suspicious` verdict with `monster: "bank"` gives monster `generic`; a `high` verdict with `monster: "bank"` gives `bank`.
- `semanticMode: "budget-exhausted"` with a `suspicious` verdict gives `aiNote.key === "result.aiNote.unavailable"`; `semanticMode: "used"` gives `null`; `semantic.status: "degraded"` with mode `undefined` gives non-null; `"skipped"` gives `null`.
- A `no_signals` verdict with `not-configured` uses the strong reminder; with `used` the normal one.
- Every ready and withheld view has `limitsNoteKey` equal to `result.limitsNote`, and its English text matches REQ-PAGE-13.
- `runCheck` with a text only calls `buildAnalyzeRequest` and `analyzeRequest`, never `ingestImage`; with an ingest `errorCode` and user text it continues; with an ingest `errorCode` and no text it returns `failed` with an ingest message key.
- Component render tests (React Testing Library is NOT added; see design): the page markup is checked through a pure `view → structure` mapping (section order list), see design.

## Out of Scope

New analyzers or API changes; changing scores or levels; the monster guide
page; SVG art beyond one simple original shape per monster (inline SVG, no
external file); re-running analysis on language change; a Vietnamese review
pass; Playwright E2E (a later spec); any new dependency.

## Open points (assumptions made, confirm or change)

1. The wording "A few things to double-check" is taken from the request as the
   example. `privacy-and-safety.md` currently says `suspicious` = "Some warning
   signs present"; this spec treats the request as newer and updates that row.
2. The AI_Note is not shown for mode `skipped` (the AI was not needed, for
   example a critical rule result or only URLs). If you want it for
   URL-only input too, say so.
3. `unavailable` status with no mode counts as "not available" (REQ-PAGE-07).

## Non-Functional Requirements

- **NFR-PAGE-01** All new pure functions are total and deterministic and inputs are never mutated.
- **NFR-PAGE-02** First load of the page does not load Tesseract or zxing code; they load only when an image is checked.
- **NFR-PAGE-03** `vitest run`, `npx tsc --noEmit` and `npm run lint` pass; `next build` succeeds.
