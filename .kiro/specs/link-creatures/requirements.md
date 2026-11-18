# Requirements Document

## Introduction

A secondary layer of "link creatures" in the presentation layer (`src/ui/`).
Each kind of suspicious link trait that the URL analyzer can report gets one
creature, shown on URL signal cards. Creatures explain a trait. They never
change the risk level, the score or the main monster.

Numbering: new `REQ-LINK-` series, `PBT-105` onward (the last existing number
is `PBT-104`, in `halloween-voice`).

There are no React components or SVG artwork in this spec. They come in the next
spec. The monster guide page is also out of scope.

**Hard constraints:**

- Changed files are in `src/ui/` (code and tests) plus one paragraph in `README.md` (REQ-LINK-20, the user asked for it). `src/core/`, `src/analyzers/`, `src/pipeline/`, `src/server/`, `src/app/api/`, the `POST /api/analyze` contract and the existing monster selection (`chooseMonster`) are NOT changed.
- No DOM, no network, no new dependency. Tests run in `node` with fakes.
- Client source imports only types from `src/pipeline/`. Test files may import the real `UrlAnalyzer` and its source.
- Link wording (ui-rules): the tool never visits a link. Creature texts say a link "has traits of" something. They never call a link "fake", "malicious" or "dangerous" as a fact. Links stay plain text.
- Creature names are original folklore-style names. No trademarked characters.

## Existing requirements and tests this spec modifies

| Item | Change |
|---|---|
| REQ-UI-21 (`ui-presentation`) | Extended: a ready view also carries `linkCreatures`, and its label keys now include the creature keys. All other behavior is unchanged. |
| REQ-UI-15 to REQ-UI-20 | Unchanged in behavior. The `ReadyResultView` type gains one field (`linkCreatures`); the level, monster, meter, highlights, groups, actions and limitations stay as they are (REQ-LINK-13). |
| REQ-UI-32 | Extended: seven new color tokens in `COLOR_TOKENS` and both palettes. |
| REQ-UI-34 | Extended: 14 new declared pairs (seven tokens on `surface` and `raised`). |
| REQ-UI-35, REQ-UI-37 | Unchanged rule. It now also covers the new pairs and tokens referenced by `LINK_CREATURES`. |
| REQ-UI-07 | Unchanged rule. The new Vietnamese strings are listed in this spec's `design.md`, flagged draft. |
| REQ-VOICE-01, REQ-VOICE-04 | Extended: `TIER_RULES` in `src/ui/i18n/voice.ts` gets the prefix `link.` in the tier C rule. No key moves tier. |
| PBT-70, PBT-72 | Not edited. They iterate every key, pair and token, so they cover the new ones. |
| PBT-100, PBT-101, PBT-102 | Not edited. They cover the new keys through `tierOf` (tier C: no horror word, no banned word). |
| `pairs.test.ts`, `css-vars.test.ts`, `css-vars.property.test.ts` | Not edited. They iterate `DECLARED_PAIRS` and `COLOR_TOKENS`. |
| `src/ui/index.ts` | Edited: new exports (REQ-LINK-08). |
| PBT-65, PBT-66 and `result-view*.test.ts` | Not edited. They still pass because the old fields do not change. |

No existing test file is edited. All other existing requirements and tests are unchanged.

## Glossary

- **Link creature**: A named character for one kind of link trait, defined by one entry of `LINK_CREATURES`.
- **Tone band**: `strong`, `medium` or `soft`. How firm the wording for a creature is. It is shown by a label and an icon key, not by color alone.
- **Url signal**: A verdict signal whose `source` is `"url"`.

## Requirements

### Requirement 1: Creature table

**User Story:** As a young professional, I want each kind of suspicious link trait to have its own name, so that I can recognize it next time.

```ts
type LinkTone = "strong" | "medium" | "soft";
type LinkCreatureId =
  | "doppelganger" | "changeling" | "faceless-one" | "masked-stranger"
  | "hydra" | "cloaked-gate" | "wisp";
interface LinkCreature {
  readonly id: LinkCreatureId;
  readonly signalId: string;            // a url.* signal id
  readonly nameKey: MessageKey;         // link.<id>.name
  readonly colorToken: ColorToken;      // link-<id>
  readonly artKey: string;              // creature-<id>
  readonly tone: LinkTone;
}
const LINK_CREATURES: readonly LinkCreature[];   // src/ui/link-creatures.ts, in this order
const LINK_TONES: Readonly<Record<LinkTone, { labelKey: MessageKey; iconKey: string; explanationKey: MessageKey }>>;
```

#### Acceptance Criteria

1. **REQ-LINK-01** THE table SHALL have exactly these entries in this order (signal id, English name, tone): `url.brand-lookalike` "Doppelganger" `strong`; `url.punycode-host` "Changeling" `strong`; `url.ip-address-host` "Faceless One" `strong`; `url.at-in-authority` "Masked Stranger" `strong`; `url.excessive-subdomains` "Hydra" `medium`; `url.known-shortener` "Cloaked Gate" `soft`; `url.credential-keywords` "Wisp" `soft`.
2. **REQ-LINK-02** EACH entry SHALL have a unique creature `id`, a unique `signalId`, a `nameKey` equal to `link.<id>.name`, a unique `colorToken` `link-<id>` that exists in both palettes, and a unique kebab-case `artKey` `creature-<id>`. The SVG components are built in the next spec.
3. **REQ-LINK-03** THE mapping SHALL be exactly one-to-one with the `url.*` ids the URL analyzer can emit. A test SHALL read those ids from `src/analyzers/url-analyzer.ts` (the analyzer exports no id list, so it scans for `id: "url.…"` the way `signal-ids.test.ts` does), SHALL check that the set of `signalId` values equals that set, and SHALL check that each id is also in `KNOWN_SIGNAL_IDS`. Adding an analyzer signal without a creature SHALL fail this test.
4. **REQ-LINK-04** `LINK_TONES` SHALL give each of the three bands a `labelKey` (`link.tone.<band>.label`), an `iconKey` (`icon-tone-strong`, `icon-tone-medium`, `icon-tone-soft`) and an `explanationKey` (`link.tone.<band>.explain`). Label keys, icon keys and explanation keys SHALL be pairwise different, and the icon keys SHALL differ from the four level icon keys, so that a band is never shown by color alone.

### Requirement 2: Dictionary

**User Story:** As an older reader, I want each creature explained in a few calm, plain sentences with a next step, so that I know what to do.

#### Acceptance Criteria

1. **REQ-LINK-05** FOR every creature, BOTH dictionaries SHALL contain `link.<id>.name`, `link.<id>.desc` (one sentence) and `link.<id>.tip1`, `.tip2`, `.tip3`. For every tone band they SHALL contain `link.tone.<band>.label` and `link.tone.<band>.explain`. The English text is written first and is the reference. The Vietnamese text is a draft listed in `design.md` and tests SHALL NOT pin its wording.
2. **REQ-LINK-06** EACH English description SHALL contain "has traits of". NO creature, tone or explanation text, in either language, SHALL call a link "fake", "malicious" or "dangerous" as a fact. A test SHALL check the English texts with `/\b(fake|malicious|dangerous)\b/i` and the Vietnamese texts with `/giả mạo|độc hại|nguy hiểm/i`. The texts SHALL contain no word of the `safe` family (REQ-UI-06).
3. **REQ-LINK-07** EVERY `link.*` key SHALL be tier C (plain, no horror word, banned words as in `halloween-voice.md`). The only code change for this is adding `link\.` to the tier C prefix rule in `src/ui/i18n/voice.ts`. Every sentence has at most 25 words (REQ-UI-07).

### Requirement 3: View model

**User Story:** As a family helper, I want the result to list which link traits were found, so that I can explain them to my parent.

```ts
interface LinkCreatureView {
  readonly id: LinkCreatureId;
  readonly nameKey: MessageKey;
  readonly descriptionKey: MessageKey;
  readonly tipKeys: readonly MessageKey[];     // three keys
  readonly colorToken: ColorToken;
  readonly artKey: string;
  readonly tone: LinkTone;
  readonly toneLabelKey: MessageKey;
  readonly toneIconKey: string;
  readonly explanationKey: MessageKey;         // the link-explanation line of the tone band
  readonly signalIds: readonly string[];       // signals that support it, verdict order, unique
  readonly evidence: string;                   // shortEvidence of the first supporting signal
}
// ReadyResultView gains: readonly linkCreatures: readonly LinkCreatureView[];
```

#### Acceptance Criteria

1. **REQ-LINK-08** THE `ReadyResultView` SHALL have a new field `linkCreatures`. The withheld view has no such field. `src/ui/index.ts` SHALL export `LINK_CREATURES`, `LINK_TONES` and the types `LinkCreature`, `LinkCreatureId`, `LinkTone` and `LinkCreatureView`.
2. **REQ-LINK-09** THE list SHALL be derived only from url signals: a signal counts when its `source` is `"url"`, its `id` is a `signalId` of the table, and its `shortEvidence` is not empty (as for a signal card). Signals of any other source never contribute, even with a `url.*` id.
3. **REQ-LINK-10** THE list SHALL have at most one item per creature, sorted by severity descending, then by table order. The severity of a creature is the highest `severity` among its supporting signals; a non-finite or non-number severity counts as 0.
4. **REQ-LINK-11** EACH item SHALL carry the table fields, the tone label key, icon key and explanation key of its band, the unique `signalIds` that support it (today always one id, because the table is one-to-one) and `evidence`, the existing `shortEvidence` of the first supporting signal in verdict order.
5. **REQ-LINK-12** THE list SHALL be empty when there are no url signals (including the neutral state and a verdict with only text, semantic, image or qr signals).
6. **REQ-LINK-13** THE level, the main monster, the risk meter, the highlights, the signal groups, the actions, the limitations, the notices and the semantic note SHALL be exactly what they were before this spec for every verdict. `chooseMonster` and the score are not changed and never read `linkCreatures`.
7. **REQ-LINK-14** THE `buildResultView` function SHALL still never throw. Any failure while building the list SHALL give `[]` and SHALL NOT turn a ready view into a withheld one. The result is deterministic, immutable and uses no input mutation (NFR-UI-02 to NFR-UI-04).

### Requirement 4: Theme

**User Story:** As a user with weak eyesight, I want the creature colors to be readable and never the only clue, so that I can tell them apart.

#### Acceptance Criteria

1. **REQ-LINK-15** `COLOR_TOKENS` and both palettes SHALL have the seven tokens `link-doppelganger`, `link-changeling`, `link-faceless-one`, `link-masked-stranger`, `link-hydra`, `link-cloaked-gate`, `link-wisp`, valued as in `design.md`. The seven values SHALL be pairwise different in each palette.
2. **REQ-LINK-16** `DECLARED_PAIRS` SHALL add every creature token as `text` on `surface` and on `raised` (14 pairs: the creature name drawn on a card). Each SHALL meet 4.5 in the normal palette and 7 in the high-contrast palette. Any other pair a later spec uses SHALL be declared in that spec.
3. **REQ-LINK-17** THE tone band SHALL be shown by its label key and icon key as well as by color. The tone text on a card uses the existing `text` and `muted` tokens, so it adds no new pair.

### Requirement 5: Explanation line and README

#### Acceptance Criteria

1. **REQ-LINK-18** FOR each tone band, the dictionary SHALL have one link-explanation line `link.tone.<band>.explain` in both languages, for the result card. The `strong` line in English is "This link has traits that are often used to hide where it really goes." followed by a next step (full text in `design.md`).
2. **REQ-LINK-19** EACH `LinkCreatureView.explanationKey` SHALL be the key of its band, so a component can show one line per tone band without a new lookup.
3. **REQ-LINK-20** `README.md` SHALL get a short section "Link creatures" (before "Known limits") that says what creatures are, that they never change the level, score or main monster, and the honest limit that the tool never opens, visits or tests a link. The text is in `design.md`.

## Property-Based Testing Requirements

Continues after PBT-104. Use `numRuns >= 100`. Verdicts are generated as in PBT-65: level not `no_signals` has at least one signal, signals use ids from `KNOWN_SIGNAL_IDS` (including `url.*` ids with non-url sources), random severities (including `NaN` and `Infinity` in one arbitrary) and random evidence.

| ID | Property | Generator hint |
|---|---|---|
| **PBT-105** | `buildResultView` never throws and returns a view for any verdict and any garbage input; `linkCreatures` contains only creature ids from the table, no duplicate id, is sorted by severity descending then table order, and is deterministic (two calls are deeply equal and the input is not mutated) (REQ-LINK-10, REQ-LINK-14) | Verdict arbitrary of PBT-65, `fc.anything()` |
| **PBT-106** | The list is derived only from url signals: adding any number of non-url signals (any id, including `url.*`) to a verdict never changes it; appending a url signal never removes a creature that was present; the list equals the list built from the url signals alone (REQ-LINK-09, REQ-LINK-10) | Two signal arrays, random order |
| **PBT-107** | For arbitrary verdicts, level, monster, meter, highlights, signal groups, actions, limitations, notices and semantic note equal the output of a copy of the pre-change projection kept in the test (REQ-LINK-13) | Verdict arbitrary, locale and extras arbitraries of PBT-65 |
| **PBT-108** | Dictionaries: for every creature and tone key, both languages have a non-empty value and the same placeholders; each creature has a name, a description and three tips; the English descriptions contain "has traits of"; the wording regexes of REQ-LINK-06 never match; every key is tier C (REQ-LINK-05 to REQ-LINK-07) | `fc.constantFrom` over creatures, tones and languages |
| **PBT-109** | Contrast: every declared link pair meets 4.5 (normal) and 7 (high contrast); the seven tokens are pairwise different in each palette (REQ-LINK-15, REQ-LINK-16) | `fc.constantFrom` over the new pairs |

### Example-based tests

- A verdict with `url.brand-lookalike` gives one item, "Doppelganger", tone `strong`, evidence from that signal.
- A verdict with `url.ip-address-host` and `url.credential-keywords` gives "Faceless One" then "Wisp" (severity 0.7 before 0.45).
- A verdict with only text signals, and a `no_signals` verdict, give `[]`.
- Two `url.known-shortener` signals give one "Cloaked Gate" with the first signal's evidence.
- Every creature has a tone band, and the bands are `strong` ×4, `medium` ×1, `soft` ×2.
- The real `UrlAnalyzer` run on sample links (a lookalike, a punycode host, an IP host, an `@` link, a long subdomain chain, a shortener, a login path) emits only ids that the table contains, and every id of the table is emitted by at least one sample.
- The signal ids read from `url-analyzer.ts` equal the table's `signalId` set.

## Out of Scope

SVG artwork and React components (built in the `ui-page` amendment, Requirement 8), the monster guide page, any
change to analyzers, pipeline, server or API, any change to monster selection,
new dependencies, clickable links, rewording the existing `signal.url.*.explain`
texts.

Note for a later spec (not changed here): `signal.url.excessive-subdomains.explain`
and `signal.url.credential-keywords.explain` currently contain the word "fake",
which the link wording rule in `ui-rules.md` forbids. REQ-LINK-06 checks only the
new creature texts.

