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

## Amendment: link creature badges

The page is already built and its tasks 1 to 6 are checked, so they are not
reopened. This amendment adds Requirement 8 (`REQ-PAGE-40` to `REQ-PAGE-46`),
PBT-110 to PBT-113 (global numbering continues after `PBT-109` of
`link-creatures`) and a new task group 7. It shows the link creatures of the
`link-creatures` spec on URL signal cards.

**Dependency:** `link-creatures` tasks 1 to 4 (table, `link.*` keys, `link-*`
color tokens, `ReadyResultView.linkCreatures`) must be done first. This
amendment does not repeat them. It uses `LINK_CREATURES`, `LINK_TONES` and
`linkCreatures` as they are specified there. The "SVG artwork and components"
that `link-creatures` left for a later spec are built here.

Existing items this amendment modifies:

| Existing item | Change |
|---|---|
| REQ-PAGE-23 | Extended: a signal card in the `url` group can carry a creature badge. The section order is unchanged. |
| REQ-PAGE-34 | Extended: 14 new declared `ui` pairs (the seven `link-*` tokens on `surface` and `raised`, for the badge art). |
| REQ-PAGE-39 | Extended: the new component file is covered by the hard-coded text scan; the new art file carries no text. |
| REQ-PAGE-37, `components.boundaries.test.ts` | Edited: extra rules for the files that show link text (REQ-PAGE-44). |
| REQ-UI-03 (`ui-presentation`) | Amended: the English and Vietnamese texts of the seven `signal.url.*.explain` keys are rewritten to follow the link wording rule (REQ-PAGE-45). The ids and the "plain-English rewrite with a next step" rule stay. Any existing test that pins an old text is updated. |
| `src/components/icons.tsx` | Extended: generic link icon and three tone icons. |
| `src/components/EvidenceList.tsx` | Edited: renders the badge. |
| `art/registry.tsx`, `art/registry.test.ts`, `art-budget.test.ts` | Not edited. Link creature art has its own registry (its fallback is a link icon, not the Odd Shadow). The budget test covers the new art file by itself (limit 30 KB per file, 350 KB in total; art is about 160 KB today). |
| `ResultPanel.test.ts`, `result-markup.property.test.ts`, PBT-65, PBT-66 | Not edited. They must still pass. |

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

## Amendment: link spotlight

Group 7 is built and its tasks are checked, so they are not reopened. This
amendment adds Requirement 9 (`REQ-PAGE-47` to `REQ-PAGE-54`), PBT-114 to
PBT-115 (the next free numbers after `PBT-113`) and a new task group 8. It
moves the link badges out of the url signal card into one section placed right
after the Level_Banner, so a user sees at once that the checked content has a
link. Request (Vietnamese): "Tôi muốn hiển thị rõ hơn badge khi có đường dẫn xuất hiện trong nội dung kiểm tra".

Decision: the badge is **moved**, not copied. The url card keeps its explanation,
evidence, severity and the `link.plain.note`; it no longer shows a badge. So each
creature appears once on the result.

Existing items this amendment modifies:

| Existing item | Change |
|---|---|
| REQ-PAGE-23 | Extended: when `view.linkCreatures` is non-empty, a Link_Spotlight comes right after the Level_Banner and before the AI_Note. All other sections keep their order. |
| REQ-PAGE-40 | Amended: the Link_Badge is no longer shown on the signal card. It is shown in the Link_Spotlight (REQ-PAGE-47, REQ-PAGE-48). Its content and order of parts are unchanged. |
| REQ-PAGE-41, PBT-110, `link-badges.ts` | Kept as is, but no longer used by `EvidenceList`. They stay for the monster guide and tests. If nothing else uses them when task 8 is done, the function is not deleted (a later spec decides). |
| REQ-PAGE-44 | Extended: the no-link-element rule also covers `LinkSpotlight.tsx` and `ResultPanel.tsx`. `link.plain.note` stays once in the url group. |
| REQ-PAGE-39 | Extended: `LinkSpotlight.tsx` is covered by the hard-coded text scan. |
| PBT-112 | Edited: now checks that `EvidenceList` shows no creature name and no badge, and still escapes evidence (REQ-PAGE-49). The "name shown once" check moves to PBT-114. |
| `page-layout.ts`, `journal.ts`, `ResultPanel.tsx` (`renderSection`), `EvidenceList.tsx` | Edited. New `SectionId` `linkSpotlight`. |
| `ResultPanel.test.ts`, `page-layout.test.ts`, `journal` tests | Edited only where they pin the section list for a view with links. Views without links give the same list as before. |

Everything else (hard constraints of the badge amendment, the link wording rule,
privacy) is unchanged. No change to `src/core`, `src/analyzers`, `src/pipeline`,
`src/server`, `src/app/api` or the API contract.

## Glossary

- **Link_Spotlight**: The section with a heading and the Link_Badges of all `view.linkCreatures`, placed right after the Level_Banner.
- **Level_Banner**: The component block showing the level label, level icon and risk meter.
- **Action_Box**: The "What to do now" block listing `verdict.actions`.
- **Evidence_List**: The grouped signal cards and the highlighted message.
- **AI_Note**: The prominent note shown when the extra AI (semantic) check was not available.
- **Limits_Note**: The always-visible sentence saying the tool cannot prove a message is genuine.
- **Strong_Reminder**: The `no_signals` reminder used when the AI_Note is shown.
- **Technical_Details**: The collapsed section with the semantic mode note, error codes and similar.
- **Page_State**: `idle | working | done | failed` plus the data each carries.
- **Link_Badge**: The block on a URL signal card showing a creature's art, name, description, tone label with icon, and tone explanation line.
- **Link_Art**: The small original inline SVG of one link creature, chosen by its `artKey`.

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

### Requirement 8: Link creature badges

**User Story:** As a family helper, I want each suspicious part of a link named and explained on its card, so that I can tell my parent what to look for without opening the link.

#### Acceptance Criteria

1. **REQ-PAGE-40** ON a signal card of the `url` group, WHEN a creature of `view.linkCreatures` is supported by that card's signal, THE card SHALL show a Link_Badge with, in this order: the Link_Art, the caption `link.badge.caption`, the creature name, the one-sentence description (`link.<id>.desc`), the tone label with its tone icon, and the tone explanation line (`explanationKey`). The existing card parts (explanation, evidence, severity) stay. Cards of other groups never show a badge, even for a `url.*` id.
2. **REQ-PAGE-41** A pure function `linkBadgesForGroup(group, linkCreatures)` in `src/ui/view/link-badges.ts` SHALL return an array aligned with `group.cards`: for the `url` group, the creature on the first card whose `signalId` is in `creature.signalIds`, and `null` on every other card, so each creature appears at most once; for any other group, all `null`. It never throws and never mutates. The component only renders its result.
3. **REQ-PAGE-42** THE seven Link_Art pieces SHALL be original inline SVG in `src/components/art/link-creatures.tsx`, one per `artKey` of `LINK_CREATURES`, built from simple shapes only (at most 12 elements each, `viewBox="0 0 48 48"`, `aria-hidden="true"`, `focusable="false"`). They carry no text, `<title>`, `<filter>`, `<animate>`, `<image>`, `<foreignObject>`, `<script>` or color literal. Strokes and fills use `currentColor`, and the badge sets that color from the creature's token (`var(--th-link-<id>)`). The registry keys equal the table's `artKey` set exactly.
4. **REQ-PAGE-43** THE component `LinkCreatureArt` SHALL render the generic link icon (`IconLink`) for any `artKey` that has no registered art (unknown, empty, non-string, or an inherited name such as `constructor` or `__proto__`), and SHALL NOT throw. An unknown tone icon key falls back to the `soft` tone icon. A badge whose art falls back still shows the name, description, tone label and explanation line.
5. **REQ-PAGE-44** THE link text on the card SHALL be plain, non-clickable text: `LinkCreatureView.evidence` is rendered in a `<span>` (wrapping with `break-words`), and the Link_Badge, the url group and `HighlightedMessage` contain no `<a>`, `href`, `onClick`, `role="link"` or `tabIndex`. The url group shows `link.plain.note` once under its heading. The source scan forbids `href`, `<a ` and `onClick` in `LinkBadge.tsx`, `EvidenceList.tsx` and `HighlightedMessage.tsx` (the skip link in `page.tsx` is not affected).
6. **REQ-PAGE-45** THE link wording rule SHALL hold for every string a badge or url card can show: `link.*`, `link.badge.caption`, `link.plain.note` and the seven `signal.url.*.explain` keys, in both languages. None may call a link "fake", "malicious" or "dangerous" (English `/\b(fake|malicious|dangerous)\b/i`, Vietnamese `/giả mạo|độc hại|nguy hiểm|trang giả|trang web giả/i`), none may state as a fact that a link or site is not real or is a scam page, and each says what the link "has traits of" or "can" do. The rewritten `signal.url.*.explain` texts are in `design.md` (Vietnamese drafts, pending human review).
7. **REQ-PAGE-46** EVERY color pair used by the badge SHALL be declared: the seven `link-*` tokens on `surface` and on `raised` as `ui` (art), and the text already declared (`text`, `muted` on `surface`). All meet the thresholds in both palettes. The tone is shown by label and icon as well as color. Badge text sizes are in `rem` (no fixed pixels) and nothing animates or flashes.

### Requirement 9: Link spotlight

**User Story:** As a family helper, I want the link badges shown right under the risk level, so that I notice at once that the message has a link and see what to tell my parent.

#### Acceptance Criteria

1. **REQ-PAGE-47** WHEN `view.linkCreatures` of a ready view is non-empty, THE ResultPanel SHALL show one Link_Spotlight directly after the Level_Banner and before the AI_Note, the Action_Box and the Evidence_List. WHEN it is empty, or the view is `withheld`, THE ResultPanel SHALL render no Link_Spotlight and no empty wrapper. `resultSections` SHALL include the new id `linkSpotlight` in exactly those cases.
2. **REQ-PAGE-48** THE Link_Spotlight SHALL be a `<section>` with `aria-labelledby` pointing to its own heading (`result.links.heading`, "Links in this message" / "Đường dẫn trong nội dung"), followed by one Link_Badge (the existing `LinkBadge`, unchanged) for each creature of `view.linkCreatures`, in the order that `buildLinkCreatures` gives. The heading id SHALL be unique on the page. The badges SHALL be list items of one `<ul>`.
3. **REQ-PAGE-49** THE url group of the Evidence_List SHALL show no Link_Badge, no creature name and no creature art. It SHALL keep, for each card, the explanation, the evidence in a plain `<span>` and the severity text, and SHALL keep `link.plain.note` once under the group heading.
4. **REQ-PAGE-50** EACH creature of `view.linkCreatures` SHALL appear exactly once in the whole result markup (name, description, tone label and explanation line each once per creature), and EVERY badge SHALL stay backed by evidence: it carries the `evidence` text of its creature, and the signal card it came from stays in the Evidence_List.
5. **REQ-PAGE-51** THE Link_Spotlight and its badges SHALL be plain, non-clickable text: no `<a`, `href`, `onClick`, `role="link"` or `tabIndex` in `LinkSpotlight.tsx`, `LinkBadge.tsx` or `ResultPanel.tsx`. Evidence containing markup SHALL appear as escaped text.
6. **REQ-PAGE-52** THE new key `result.links.heading` SHALL exist in `en` and `vi` with equal placeholders, SHALL belong to tier C (plain only), SHALL follow the link wording rule of REQ-PAGE-45 (no "fake", "malicious", "dangerous", no safe-family word, at most 25 words) and SHALL NOT say or suggest that the link is a scam. It joins the key set checked by PBT-113.
7. **REQ-PAGE-53** THE Link_Spotlight SHALL use only sizes in `rem` and colors from declared pairs (text on `surface`, as the badge does today), SHALL not animate, and SHALL NOT add a new frame, icon or color token. The heading uses the same size class as the other section headings. WHILE the journal is shown, THE Link_Spotlight SHALL be one of the page 2 sections and SHALL come first among them (see Open point 7).
8. **REQ-PAGE-54** THE Link_Spotlight SHALL NOT change the level, the score, the monster, the actions or the order of the other sections. FOR a view whose `linkCreatures` is empty, `resultSections` SHALL return exactly the list it returned before this amendment.

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

Added by the link creature amendment (continues after `PBT-109`):

| ID | Property |
|---|---|
| **PBT-110** | `linkBadgesForGroup` never throws for any group and creature list (including garbage); the result has the same length as `group.cards`; it has a non-null item only for the `url` group; each creature appears at most once; a non-null badge's creature supports that card's `signalId`; two calls give equal results and inputs are not mutated (REQ-PAGE-41) |
| **PBT-111** | `LinkCreatureArt` rendered with `renderToStaticMarkup` for any `artKey` (`fc.anything()`, `fc.string()`, `constantFrom("constructor","__proto__","toString","")`) never throws and always yields a decorative `svg` (`aria-hidden`, `focusable="false"`); for a key outside the registry the markup equals the `IconLink` markup; for each table `artKey` the markup is not the fallback; no forbidden tag or color literal appears (REQ-PAGE-42, REQ-PAGE-43) |
| **PBT-112** | *(Edited by the link spotlight amendment.)* For arbitrary verdicts with url signals (evidence may contain `<a href="x">` and other markup), `EvidenceList` markup contains no `<a `, `href=`, `onClick` or `role="link"` outside escaped text, shows the evidence as escaped text, and shows no creature name (the "once" check is PBT-114), in both locales (REQ-PAGE-44, REQ-PAGE-49) |
| **PBT-113** | For every key in the REQ-PAGE-45 set and both languages: the value is non-empty with equal placeholders in both languages, matches none of the wording regexes, contains no word of the `safe` family, has sentences of at most 25 words, and is tier C (REQ-PAGE-45) |

Added by the link spotlight amendment (continues after `PBT-113`):

| ID | Property |
|---|---|
| **PBT-114** | For arbitrary verdicts with url signals (evidence may contain `<a href="x">` and other markup), in both locales: `resultSections` contains `linkSpotlight` exactly when `view.linkCreatures` is non-empty and the view is ready, right after `levelBanner` and before `aiNote`, `actions` and `evidence`; with no creatures the list equals the pre-amendment list; the `ResultPanel` markup shows the name of every creature exactly once, in `buildLinkCreatures` order; contains no `<a `, `href=`, `onClick` or `role="link"` outside escaped text; the section has an `aria-labelledby` that matches a heading id present once (REQ-PAGE-47, REQ-PAGE-48, REQ-PAGE-50, REQ-PAGE-51, REQ-PAGE-54) |
| **PBT-115** | For arbitrary ready views, `EvidenceList` markup contains none of the creature names, no `link.badge.caption` text and no creature art, and every url card still shows its evidence as escaped text; the `link.plain.note` text appears exactly once when the view has a url group (REQ-PAGE-49) |

### Example-based tests

- A verdict with `url.brand-lookalike` and `url.known-shortener` renders the heading "Links in this message" and two badges between the level banner and the action box; the url cards below show evidence and severity but no badge.
- A verdict with no url signal has no Link_Spotlight and the same section list as before.
- A `withheld` view has no Link_Spotlight.
- In the journal, `page2` starts with `linkSpotlight` for a view with links.

- A verdict with `url.brand-lookalike` renders a badge named "Doppelganger" with its description and the strong-band label and explanation line; the card also keeps its explanation, evidence and severity.
- Two `url.known-shortener` cards show one "Cloaked Gate" badge, on the first card only.
- A `url.ip-address-host` signal with source `text` shows no badge.
- A creature with `artKey: "creature-unknown"` (fake view) shows the generic link icon and the rest of the badge.
- The url group shows the `link.plain.note` text once; the page markup for a link evidence has no `<a>` around it.
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
external file) and one per link creature; re-running analysis on language
change; a Vietnamese review pass; Playwright E2E (a later spec); any new
dependency.

**Monster guide (later spec, not built here).** Its "Link creatures" section
SHALL be built from the same `LINK_CREATURES` table, the same `LinkCreatureArt`
component, the same `link.*` keys (name, description, three tips) and the same
wording rule, with no second list of creatures. This amendment exports
`LinkCreatureArt` and `IconLink` for that reuse and adds nothing guide-specific.

## Open points (assumptions made, confirm or change)

1. The wording "A few things to double-check" is taken from the request as the
   example. `privacy-and-safety.md` currently says `suspicious` = "Some warning
   signs present"; this spec treats the request as newer and updates that row.
2. The AI_Note is not shown for mode `skipped` (the AI was not needed, for
   example a critical rule result or only URLs). If you want it for
   URL-only input too, say so.
3. `unavailable` status with no mode counts as "not available" (REQ-PAGE-07).
4. *(Link creature amendment.)* "Show the URL text itself" is read as the
   creature's `evidence` (what the URL analyzer reports: the host, the `@`
   part, the keywords and similar, cut to 80 characters), shown as plain text
   on the card. The full link stays visible, also as plain text, inside the
   highlighted message. If you want the full URL on every card, the view model
   needs a new field, which changes `link-creatures`; say so.
5. *(Link creature amendment.)* The badge shows name, description and the tone
   line, not the three tips. The tips are for the monster guide.
6. *(Link creature amendment.)* Rewriting the seven `signal.url.*.explain`
   texts is needed because two of them say "fake" and one says a site "is not
   the real site", which the link wording rule forbids on the same card.

7. *(Link spotlight amendment.)* The hunter's journal keeps page 1 to 3 clues,
   3 actions and one note line (`hunter-scene-rules.md`), so the spotlight is
   the first section of page 2 there, not on page 1. In the classic
   `ResultPanel` it sits right under the Level_Banner. If you want a one-line
   link hint on journal page 1 too, say so; that needs a `hunter-ui` change.
8. *(Link spotlight amendment.)* The spotlight comes before the AI_Note and the
   Action_Box because the request says "directly below the risk-level banner".
   REQ-PAGE-04 (banner, then actions, then evidence) still holds for the other
   sections. Say so if you prefer it after the Action_Box.

## Non-Functional Requirements

- **NFR-PAGE-01** All new pure functions are total and deterministic and inputs are never mutated.
- **NFR-PAGE-02** First load of the page does not load Tesseract or zxing code; they load only when an image is checked.
- **NFR-PAGE-03** `vitest run`, `npx tsc --noEmit` and `npm run lint` pass; `next build` succeeds.
