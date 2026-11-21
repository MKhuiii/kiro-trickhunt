# Requirements Document

## Introduction

Two new main monsters: **investment** ("Profit Goblin") and **romance**
("Heart Wraith"). Today an investment pitch or a romance scam with a money
request reaches no signal in rules-only mode, and with the AI layer on it gets
the wrong monster (`job-bait` or `generic`; see `design.md`, "Diagnosis
(before)"). This spec adds two text signal groups, two monsters, the data that
every list keyed by monster id needs, and 20 synthetic evaluation samples.

This is a deliberate change to frozen closed sets and configuration: the
`MonsterId` set (REQ-PIPE-02 and the type in `analysis-pipeline`), the monster
list, the tie-break order, two overlap groups, the combination rules, the text
pattern list, `KNOWN_SIGNAL_IDS`, the palettes and the art registry. Every
existing requirement, test, sample and config it modifies is listed in
"Existing Requirements, Tests, Samples and Config Modified".

Numbering continues: `REQ-PIPE-72` onward, `REQ-TXT-33` onward, `REQ-UI-47`
onward, `REQ-HUNT-77` onward, `PBT-145` onward, `NFR-RT-06` onward. Last
existing numbers: `REQ-PIPE-71`, `REQ-TXT-32`, `REQ-UI-46`, `REQ-HUNT-76`,
`PBT-144`, `NFR-RT-05`.

**Hard constraints:** configuration, dictionary data, two SVG components and
tests. No algorithm change: `aggregate`, `applyRules`, `selectMonster`,
`reduceForScoring`, `TextAnalyzer`, `src/core/` and the awareness code are not
touched. The AI prompt and the closed semantic id set (`semantic-analyzer.config.ts`)
are not touched: no semantic id is added. No API change, no new dependency, no
link creature, no network. "Safe" wording rules still apply.

**Approved by the maintainer (Q1 to Q4, yes):** changes to rendering code and tests that
hard-code monster ids, and to the horror word list in `voice.ts` (design,
"Hard-coded places and questions").

## Glossary

- **New_Text_Signals**: `text.investment-pitch` and `text.romance-bait`.
- **NM_Samples**: the twenty samples with ids prefixed `nm-` in `src/pipeline/eval/new-monsters-samples.ts` (8 scam, 12 benign).
- **Fake_Mode**: `createPipeline({ llmClient })` with a `FakeLlmClient` that returns fixed semantic signals at severity 0.45 (the cap).
- **Rules_Mode**: `createPipeline({ llmClient: null })`.
- **Benign_Pass**: level `no_signals` or `suspicious`, and monster `null` or `generic` (defined in `rules-tuning-v1`).
- **Earlier_Samples**: the 75 samples of `EVAL_SAMPLES` and every sample of the probe sets in `probe-samples.ts`.

## Requirements

### Requirement 1: Closed monster id set and pipeline configuration

**User Story:** As a user who receives an investment or romance scam, I want the result to name the right monster, and as a maintainer I want every earlier result to stay the same.

#### Acceptance Criteria

1. **REQ-PIPE-72** `"investment"` and `"romance"` SHALL be added to `MonsterId` (`verdict.ts`) and `SpecificMonsterId` (`monsters.config.ts`), and to `MONSTER_ORDER` after the existing ones: `bank`, `prize`, `job-bait`, `authority`, `investment`, `romance`. Ids use the existing kebab-case style.
2. **REQ-PIPE-73** `MONSTERS` SHALL gain `investment` with weights `text.investment-pitch` 2, `semantic.too-good-to-be-true` 1, `semantic.isolation-secrecy` 1, `text.payment-request` 1; and `romance` with `text.romance-bait` 2, `semantic.relationship-or-job-bait` 1, `semantic.emotional-manipulation` 1, `semantic.isolation-secrecy` 1, `text.payment-request` 1. `MONSTER_THRESHOLD` stays 2. Weights are the starting values from the prototype in `design.md`; they MAY change during tuning only inside the limits of REQ-PIPE-74 and REQ-PIPE-77.
3. **REQ-PIPE-74** The weights of `investment` and `romance` for every id other than the New_Text_Signals SHALL be a subset of the `job-bait` weights (same id, same or lower weight). Because the new monsters come after `job-bait` in `MONSTER_ORDER`, a signal list without a New_Text_Signal never selects `investment` or `romance`, so no earlier result can change (PBT-149).
4. **REQ-PIPE-75** `OVERLAP_GROUPS` SHALL extend two groups, because a signal id may appear in only one group (REQ-PIPE-22): `["text.prize-reward", "text.investment-pitch", "semantic.too-good-to-be-true"]` and `["text.job-offer", "text.romance-bait", "semantic.relationship-or-job-bait"]`. A rule signal and an AI signal for the same evidence then count once in the score (REQ-PIPE-23). No other group changes.
5. **REQ-PIPE-76** `COMBINATION_RULES` SHALL gain `investment-with-payment` (`text.investment-pitch` with `text.payment-request`) and `romance-with-payment` (`text.romance-bait` with `text.payment-request`), both `minLevel: "high"`. Rules only raise.
6. **REQ-PIPE-77** `ACTIONS_BY_MONSTER` SHALL gain one non-empty entry for `investment` and one for `romance` in both `en` and `vi`, equal list lengths, no forbidden safety word (`config.test.ts` list). English sentences have at most 25 words, calm tone, one next step. Vietnamese is a draft.
7. **REQ-PIPE-78** Every Earlier_Sample SHALL keep its expected monster and level (scam: monster equals `expectedMonster` and level at or above `minLevel`; benign: unchanged `no_signals`, or the same Benign_Pass result as before), with no edit to any earlier sample. The semantic id set, `semantic-analyzer.config.ts`, the prompt, `MIN_SCORE_BY_LEVEL`, `MONSTER_THRESHOLD` and `awareness.config.ts` SHALL be unchanged.

### Requirement 2: Text signal groups

**User Story:** As a user who pastes an investment pitch or a romance message, I want the rules to point at the specific wording, and as a maintainer I want one phrase on its own never to call a message a scam.

#### Acceptance Criteria

1. **REQ-TXT-33** `TEXT_PATTERNS` SHALL gain `text.investment-pitch` and `text.romance-bait`, each with weight 0.35 (at most 0.49, so one signal alone is `suspicious`), a plain-English `whyItMatters`, and English and Vietnamese phrases. Config order: after `text.financial-institution`.
2. **REQ-TXT-34** `text.investment-pitch` SHALL match multi-word phrases for guaranteed or risk-free returns, daily profit, doubling money, a private trading group or channel, VIP signals or channel, and a deposit to join; and Vietnamese equivalents (`cam kết lợi nhuận`, `đầu tư không rủi ro`, `nhóm đầu tư kín`, `nạp tiền để tham gia`). The starting phrase list is in `design.md`.
3. **REQ-TXT-35** `text.romance-bait` SHALL match multi-word phrases that join sudden intimacy with being abroad, a risky job (oil rig, foreign port), a frozen account, or a promise to repay on return; and Vietnamese equivalents. The starting phrase list is in `design.md`.
4. **REQ-TXT-36** No phrase of either group, and no phrase added to `text.payment-request`, SHALL be a bare word. Forbidden as a whole phrase: `invest`, `investment`, `bitcoin`, `crypto`, `profit`, `returns`, `trading`, `love`, `miss you`, `overseas`, `abroad`. A test SHALL check that every added phrase has at least two words after normalization and is not on this list.
5. **REQ-TXT-37** `text.payment-request` SHALL gain gift-card request verbs (`send a gift card`, `send me a gift card`, `buy a gift card for me`, `buy me a gift card`, `send me gift cards`, and Vietnamese forms) and deposit request verbs (`deposit to join`, `deposit to start`, `send your first deposit`, `make your first deposit`, `add funds to activate`, `add funds to start`, `triệu để tham gia`). No other `text.payment-request` phrase, weight or group is edited. `Can you buy a gift card for Mum's birthday?` SHALL give the same result as before this spec (`suspicious`, `generic`, from the existing phrase `buy a gift card`).
6. **REQ-TXT-38** Every added phrase SHALL follow REQ-TXT-02 to REQ-TXT-07 and REQ-TXT-21: boundary-aware, case- and diacritic-insensitive, at most one signal per group, weights in `[0, 1]`.
7. **REQ-TXT-39** The existing groups, their weights and their other phrases SHALL be unchanged. No phrase is removed.

### Requirement 3: Evaluation set additions and diagnosis

**User Story:** As a maintainer, I want the new samples measured before and after, so that the change is shown to help and to harm nothing.

#### Acceptance Criteria

1. **REQ-PIPE-79** A new file `src/pipeline/eval/new-monsters-samples.ts` SHALL export `NM_SAMPLES`: the twenty messages of this request with the exact texts in `design.md`, ids `nm-inv-en-1` to `nm-inv-en-3`, `nm-inv-vi-1`, `nm-rom-en-1` to `nm-rom-en-3`, `nm-rom-vi-1`, `nm-ben-en-1` to `nm-ben-en-10`, `nm-ben-vi-1`, `nm-ben-vi-2`. `EVAL_SAMPLES` and `probe-samples.ts` SHALL NOT change. The file imports only from `src/pipeline` and `src/core` (REQ-PIPE-47).
2. **REQ-PIPE-80** Synthetic only: no real brand (the list in `samples.test.ts`), no real person, no phone or account number (no digit run of 8 or more), `.example` domains only (the samples hold no link). A new test SHALL check this for `NM_SAMPLES`.
3. **REQ-PIPE-81** In Rules_Mode every scam NM_Sample SHALL reach at least `suspicious`; the three investment samples with a deposit phrase (`nm-inv-en-2`, `nm-inv-en-3`, `nm-inv-vi-1`) SHALL reach at least `high` with monster `investment`.
4. **REQ-PIPE-82** In Fake_Mode every investment sample, with the fake returning `semantic.too-good-to-be-true` and `semantic.isolation-secrecy` at 0.45, SHALL give monster `investment` and level at least `high`; every romance sample, with `semantic.relationship-or-job-bait` and `semantic.pressure-escalation` at 0.45, SHALL give monster `romance` and level at least `high`. The fake's `evidence` is a substring of the sample text.
5. **REQ-PIPE-83** Every benign NM_Sample SHALL give monster `null` or `generic` and level `no_signals` or `suspicious` in Rules_Mode and in Fake_Mode with the fake returning no signals. Benign samples that gave `no_signals` before SHALL still give `no_signals`; `nm-ben-en-8` SHALL stay `suspicious`, `generic`.
6. **REQ-PIPE-84** Tests SHALL run in `src/pipeline/new-monsters.test.ts` (not under `eval/`, because the isolation test of `eval/` forbids importing the analyzers' `FakeLlmClient`). One test per sample and mode.
7. **REQ-PIPE-85** Before any config change, `design.md` SHALL record the current signals, level and monster of every NM_Sample in both modes ("Diagnosis (before)"), and at the end a before and after table (correct monsters, missed scams, false positives, and confirmation that all Earlier_Samples are unchanged). If a goal cannot be met without harming another sample, the safe changes stay and the trade-off is written under "Accepted recall loss": at most 3 samples; the maintainer is asked before a fourth.

### Requirement 4: UI data

**User Story:** As a user, I want to see the new monsters with a name, a short description, three recognition tips and an explanation for each new warning sign, in plain language.

#### Acceptance Criteria

1. **REQ-UI-47** `MONSTER_PRESENTATION` SHALL gain `investment` (`nameKey: "monster.investment.name"`, `colorToken: "monster-investment"`, `artKey: "monster-investment-goblin"`) and `romance` (`monster.romance.name`, `monster-romance`, `monster-romance-wraith`). English names: "Profit Goblin" and "Heart Wraith".
2. **REQ-UI-48** `COLOR_TOKENS`, `NORMAL_PALETTE` and `HIGH_CONTRAST_PALETTE` SHALL gain `monster-investment` and `monster-romance` (starting values in `design.md`). `pairs.ts` SHALL include both tokens in `MONSTER_TOKENS`, so each is declared as text on `surface` and `raised`. Every declared pair SHALL meet 4.5:1 (normal) and 7:1 (high contrast) for text.
3. **REQ-UI-49** `en.ts` and `vi.ts` SHALL gain, for each new monster, `monster.<id>.name`, `monster.<id>.short` (one sentence) and `monster.<id>.tip1` to `tip3`, with identical key sets in both files. English is written first in short sentences (at most 25 words, tier A and B keys at most 18), calm tone, a next step where one fits; Vietnamese is a draft.
4. **REQ-UI-50** `en.ts` and `vi.ts` SHALL gain `signal.text.investment-pitch.explain` and `signal.text.romance-bait.explain`, and `KNOWN_SIGNAL_IDS` SHALL list both ids (26 ids: 12 text, 7 url from the analyzer, 1 reputation, 6 semantic).
5. **REQ-UI-51** No new text SHALL contain "safe", "clean", "definitely", "guaranteed", "an toàn" or a promise of certainty, and no insult to the sender or the victim. Tier rules of `halloween-voice.md` apply: name and short are tier A, tips and signal explanations are tier C (no horror word).
6. **REQ-UI-52** WHEN a verdict has monster `investment` or `romance` at `high` or `critical`, THE result view, the monster stage and the scene SHALL show the new monster's name, art and tips and SHALL NOT fall back to `generic`. This needs the rendering changes of REQ-UI-53 (approved).
7. **REQ-UI-53** The maintainer approved (Q1 to Q4 yes) changes to rendering code and tests that hard-code monster ids; only these SHALL change, as listed in `design.md` ("Hard-coded places and questions"): `src/ui/view/result-view.ts` (`MONSTER_TEXT`), `src/ui/bestiary.ts` (`MONSTER_ORDER`), `src/ui/i18n/voice.ts` (horror word lists, needed for the names), and the tests listed there.

### Requirement 5: Art

**User Story:** As a user, I want each new monster to have its own picture in the same style as the others.

#### Acceptance Criteria

1. **REQ-HUNT-77** The art registry (`src/components/art/registry.tsx`) and the monster components exist, so two components SHALL be added: `MonsterInvestmentGoblin` (a small hunched figure with coins or a rising chart) and `MonsterRomanceWraith` (a hooded translucent figure holding a heart), in one new file `src/components/art/monsters-new.tsx`, registered as `monster-investment-goblin` and `monster-romance-wraith` in `ArtId` and `ART_REGISTRY`.
2. **REQ-HUNT-78** Each is original, simple (three to five shapes each, plus one `-detail` group), with no trademarked character and no third-party asset. Same markup rules as the other monsters: `viewBox="0 0 200 200"`, `aria-hidden="true"`, `focusable="false"`, `data-part` groups, no `<text>`, `<title>`, `<filter>`, `<animate>`, no hex colors, only `var(--th-...)` tokens that exist in both palettes (REQ-HUNT-42, REQ-HUNT-43, stage plain-art rule). The first token is the monster's own token (`monster-investment`, `monster-romance`).
3. **REQ-HUNT-79** The size budget of REQ-HUNT-41 SHALL hold (each file at most 30 KB, all art at most 350 KB). The pieces are placeholders in the sense of the registry comment; they need not meet the 4 to 6 shades and gradient detail standard of `hunter-scene-rules.md`. This relaxation is stated in `design.md` and applies to these two pieces only.
4. **REQ-HUNT-80** One piece at a time: the goblin is built and shown to the maintainer before the wraith is started (`hunter-scene-rules.md`, "Build one piece at a time").

### Requirement 6: Documentation

**User Story:** As a reader of the README, I want to know which monsters exist and what the rules cannot do.

#### Acceptance Criteria

1. **NFR-RT-06** THE repo-root `README.md` SHALL gain a short section listing the six main monsters (Bank Ghost, Gift Vampire, Job Zombie, Authority Banshee, Profit Goblin, Heart Wraith) and SHALL extend "Known limits" with: rules alone have low recall on unfamiliar wording; the AI layer carries most of the detection for investment and romance scams; the 20 `nm-` samples were used to tune the phrases and are not an accuracy estimate. Documentation only.
2. **NFR-RT-07** No temporary diagnosis file is committed (`src/**/tmp-*.test.ts` and `/tmp-*.txt` are git-ignored; delete them before the final task).
3. **NFR-RT-08** The full `vitest run` passes after the change. The only edited existing tests are the ones in the table below.

## Existing Requirements, Tests, Samples and Config Modified

Each item below is changed by this spec; nothing else is. "Measured" means: the
pipeline and analyzer configuration of this spec was applied as a prototype to
the current code and the whole suite was run (208 files, 2715 tests, all green
before): 8 tests in 6 files fail, all listed. The UI and art tests marked
"predicted" come from reading the code; they are re-measured in the last task.

### Requirements

| Existing | Change |
|---|---|
| `analysis-pipeline` type `MonsterId` (section 1) and "Monster Selection" (section 6: `MONSTERS` bank, prize, job-bait, authority; `MONSTER_ORDER` in that order) | Extended by two ids (REQ-PIPE-72, 73) |
| `analysis-pipeline` REQ-PIPE-22, 23 (overlap groups) | Respected. Two groups gain one id each (REQ-PIPE-75) |
| `rules-tuning-v1` REQ-PIPE-48 (monster weights) | Extended: two monsters added, earlier weights unchanged |
| `rules-tuning-v3` REQ-PIPE-60, 61 (no single signal reaches `MONSTER_THRESHOLD`) | Superseded for the two New_Text_Signals only (weight 2). A single new signal still gives `generic` at `suspicious` because of the overlap-group gate (REQ-PIPE-67), checked by PBT-145 |
| `rules-tuning-v3` REQ-PIPE-59, 62 (`COMBINATION_RULES`, `MONSTER_ORDER`, `OVERLAP_GROUPS`, `ACTIONS_*` unchanged) | Superseded for those four configs. Out of scope there: "new monsters, new signal ids" |
| `text-analyzer` pattern list (10 groups) and `rules-tuning-v3` REQ-TXT-26, 27 (payment phrases) | Extended: 12 groups; payment phrases added, none removed |
| `ui-presentation` REQ-UI-29, 30, 31 (one entry per `MonsterId`, names) | Extended by two entries and two names |
| `ui-presentation` REQ-UI-33, 34 and the declared pairs; palettes (both) | Two tokens and four pairs per palette added |
| `ui-presentation` signal ids (24, `KNOWN_SIGNAL_IDS`) | 26 |
| `bestiary` REQ-BEST (13 entries: five monsters plus eight link creatures) | Only after approval (REQ-UI-53): 15 entries |
| `hunter-ui` REQ-HUNT-38, 40 (art pieces), REQ-HUNT-41 (budget) | Two pieces added; budget still holds |
| `halloween-voice` REQ-VOICE (horror word list; required themed keys) | Only after approval (REQ-UI-53): `goblin` and `wraith` words |

### Config

| File | Change |
|---|---|
| `src/analyzers/text-analyzer.config.ts` | Two groups added; phrases added to `text.payment-request` (REQ-TXT-33 to 39) |
| `src/pipeline/monsters.config.ts` | `SpecificMonsterId`, two `MONSTERS` entries, `MONSTER_ORDER` |
| `src/pipeline/verdict.ts` | `MonsterId` type (types only) |
| `src/pipeline/overlap.config.ts` | Two groups gain one id each |
| `src/pipeline/rules.config.ts` | Two rules added (10 in total, was 8) |
| `src/pipeline/messages.config.ts` | `ACTIONS_BY_MONSTER` en and vi |
| `src/ui/monsters.ts` | Two presentation entries |
| `src/ui/theme/palettes.ts`, `src/ui/theme/pairs.ts` | Two tokens in `COLOR_TOKENS` and both palettes; two ids in `MONSTER_TOKENS` |
| `src/ui/i18n/en.ts`, `src/ui/i18n/vi.ts`, `src/ui/i18n/signal-ids.ts` | New keys; two ids |
| `src/components/art/registry.tsx` and new `monsters-new.tsx` | Two ids in `ArtId` and `ART_REGISTRY`; two components |
| `README.md` | New section; "Known limits" extended |
| Blocked until approval: `src/ui/view/result-view.ts`, `src/ui/bestiary.ts`, `src/ui/i18n/voice.ts` (and `halloween-voice.md` word list) | See design |

Not modified: `semantic-analyzer.config.ts`, the AI prompt, `pipeline.config.ts`,
`awareness.config.ts`, `reduce.ts`, `combine.ts`, `monster.ts`, `aggregator.ts`,
`src/core/`, `url-analyzer.config.ts`, the API, `src/server/`, link creatures,
`EVAL_SAMPLES`, `probe-samples.ts`.

### Samples

| File | Change |
|---|---|
| `src/pipeline/eval/new-monsters-samples.ts` (new) | Twenty `nm-` samples. The 75 `EVAL_SAMPLES` and all probe samples are untouched |

### Tests

Measured (config prototype, 8 failing tests):

| File | Test | Change |
|---|---|---|
| `src/analyzers/text-analyzer.config.test.ts` | "contains exactly the 10 expected ids" | Expected id list gains the two new ids (12) |
| `src/analyzers/text-analyzer.test.ts` | "covers all 10 groups" | Same: 12 groups, one example input each |
| `src/pipeline/config.test.ts` | "covers every MonsterId in ACTIONS_BY_MONSTER for both locales" | Local `MONSTER_IDS` gains `investment` and `romance` |
| `src/ui/monsters.test.ts` | "covers every pipeline monster plus generic and neutral" | Passes once the two presentation entries exist (fails only until then; no edit) |
| `src/ui/i18n/dictionary.property.test.ts` | PBT-70 "every signal, monster, neutral and level key exists in both languages"; PBT-79 "every id emitted by TEXT_PATTERNS is a known signal id" | Pass once the dictionary keys and `KNOWN_SIGNAL_IDS` exist (no edit) |
| `src/ui/i18n/signal-ids.test.ts` | "equal the analyzer configs ... (24)"; "includes every id used in monster weights" | Title says 26; passes with `KNOWN_SIGNAL_IDS` updated (title edit only) |

Predicted (not edited yet; each is re-measured in task 9):

| File | Test | Change |
|---|---|---|
| `src/components/art/art.test.ts` | "registry holds exactly the expected ids" (`EXPECTED_IDS`) | List gains the two art ids |
| `src/ui/i18n/voice.property.test.ts` | PBT-104 (required-themed keys carry a horror word) | Fails for "Profit Goblin" and "Heart Wraith" unless `voice.ts` word lists are extended (question Q3) |
| `src/ui/bestiary.test.ts` (2 assertions: 13 entries, 5 monsters), `src/ui/bestiary-pages.property.test.ts` (`seen.size` 13) | Counts | 15 entries and 7 monsters, only if Q2 is approved |
| `src/ui/view/result-view.ts` consumers | No test fails, but a result with monster `investment` would read `MONSTER_TEXT[...]` as `undefined` and break | New tests (REQ-UI-52), only if Q1 is approved |

Unchanged and still passing (measured): the other 202 files, including
`eval.test.ts` (all 75 samples), `probe-regression.test.ts`,
`eval.property.test.ts` (PBT-76, PBT-80), `precision.property.test.ts`,
`monster.test.ts`, `monster.gate.property.test.ts`, `semantic-monster.test.ts`,
`semantic-monster.v4.test.ts` and `combine.v3.test.ts`.

## Property-Based Testing Requirements

Continues after PBT-144. `numRuns >= 100` (or exhaustive over a finite set). Never the network.

| ID | Property | Generator hint |
|---|---|---|
| **PBT-145** | A single New_Text_Signal on its own gives level `suspicious` at most and monster `generic` (REQ-TXT-33, REQ-PIPE-73): for the signal built at its configured weight (real `reduceForScoring`, `aggregate`, `applyRules`, `selectMonster`), and for every phrase of the two groups run alone through Rules_Mode when it fires exactly one signal | `fc.constantFrom` over ids; exhaustive loop over phrases |
| **PBT-146** | Appending a benign sentence never lowers `riskScore` (Rules_Mode): extends PBT-76 to NM_Samples and every added phrase | `NM_SAMPLES` texts and added phrases; benign sentences from all benign samples |
| **PBT-147** | For every phrase added by this spec, the signal ids are the same for the upper-cased text, the lower-cased text and the diacritic-stripped text (REQ-TXT-38) | Added phrases in `fc.string()` filler |
| **PBT-148** | Every monster id of `MONSTERS` plus `generic` has a presentation entry, dictionary keys (name, short, tip1 to tip3) in both languages, non-empty actions in both locales, and a color token in both palettes whose declared pairs meet AA (4.5:1 normal, 7:1 high contrast text); every New_Text_Signal id has an explanation in both dictionaries | Exhaustive over ids |
| **PBT-149** | For any list of earlier signal ids (every id except the New_Text_Signals) at any level, `selectMonster` never returns `investment` or `romance` (REQ-PIPE-74) | `fc.array(fc.constantFrom(...EARLIER_IDS))`, `fc.constantFrom(levels)` |
| **PBT-150** | `reduceForScoring([text.investment-pitch, semantic.too-good-to-be-true])` and `reduceForScoring([text.romance-bait, semantic.relationship-or-job-bait])` each return exactly one signal, the stronger (REQ-PIPE-75) | Severities in `(0, 0.45]` |

Files: `src/pipeline/new-monsters.property.test.ts` (PBT-145, 146, 149, 150), `src/analyzers/text-analyzer.v5.property.test.ts` (PBT-147) and `src/ui/new-monsters.property.test.ts` (PBT-148).

### Example-based tests

- `src/analyzers/text-analyzer.v5.test.ts`: each added phrase group fires on its sample phrase; no added phrase is on the bare-word list; `buy a gift card for Mum's birthday` gives the same single signal as before; `I miss you so much`, `deployed overseas this year`, `working overseas this year` and `Bitcoin rose 3% today` give no signal.
- `src/pipeline/new-monsters.test.ts`: the 20 samples in both modes (REQ-PIPE-81 to 83); two single-signal checks (investment and romance, Fake_Mode with one semantic signal on a benign sample gives at most `suspicious`, `generic`); `investment-with-payment` and `romance-with-payment` fire with both groups and not with one side (REQ-PIPE-76).
- `src/pipeline/eval/` : the isolation and synthetic checks for NM_Samples (REQ-PIPE-80) live in `new-monsters.test.ts`, because `samples.test.ts` is not edited.
- `src/components/art/monsters-new.test.ts` (REQ-HUNT-78) and the new rows of `art.test.ts`, `registry.test.ts` and `svg-markup.art.test.ts` lists (the last is a list edit in a test that already loops over a local list).
- After approval of Q1: `result-view.test.ts` rows for the two monsters (name key, short key, three tip keys, art key).

## Out of Scope

Any algorithm change (`aggregate`, `applyRules`, `selectMonster`, `reduce`), the
AI prompt and the closed semantic id set, the API, UI components other than the
two SVGs, new dependencies, link creatures, a negation-aware matcher, a
held-out validation set, and a wildcard in phrase matching.

## Non-Functional Requirements

- **NFR-RT-06** to **NFR-RT-08**: see Requirement 6.
- **NFR-RT-09** The privacy rules stay as they are: no new network call, no stored or logged user text. Tests never use the network.
