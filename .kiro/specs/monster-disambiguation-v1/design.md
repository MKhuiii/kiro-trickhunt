# Design Document: monster-disambiguation-v1

## Problem

After `new-monsters-v1`, a romance or investment message could get the wrong
monster. Example: "Hey stranger, I know this is random but I feel we have a real
connection. I am working overseas on an oil rig and my account got frozen. Could
you buy a gift card for me? I will pay you back when I am home." gave `job-bait`
when the AI layer returned `relationship-or-job-bait` and `emotional-manipulation`.

Cause: `romance` and `investment` shared their semantic weights with `job-bait`
(REQ-PIPE-74), the three totals tied at 3, and `job-bait` came first in
`MONSTER_ORDER`. The AI layer also had no way to say "this is a romance or
investment story", and the phrase lists missed common wording.

## Decisions (maintainer answers)

- Add two semantic ids so the AI layer can name the type.
- When unsure, prefer the specific monster.
- Add a tie-break that puts `investment` and `romance` ahead of `job-bait`.
- A real-LLM probe on synthetic messages is allowed.

No change to `selectMonster`, `aggregate`, `applyRules`, `reduceForScoring`,
`src/core/`, the API, or `awareness.config.ts`.

## Changes

| File | Change |
|---|---|
| `src/analyzers/semantic-analyzer.config.ts` | Ids `semantic.romance-money-story` and `semantic.investment-scheme` (cap 0.45, hint, `whyItMatters`); one `PROMPT_GUIDANCE` line that limits them to messages that ask for money |
| `src/analyzers/text-analyzer.config.ts` | Multi-word phrases added to `text.romance-bait` and `text.investment-pitch` (no bare words) |
| `src/pipeline/monsters.config.ts` | `romance` +2 for `semantic.romance-money-story`; `investment` +2 for `semantic.investment-scheme`; `MONSTER_ORDER`: bank, prize, investment, romance, job-bait, authority |
| `src/pipeline/overlap.config.ts` | Prize group back to `[prize-reward, too-good-to-be-true]`; job group back to `[job-offer, relationship-or-job-bait]`; two new groups `[investment-pitch, investment-scheme]` and `[romance-bait, romance-money-story]` |
| `src/ui/i18n/signal-ids.ts`, `en.ts`, `vi.ts` | 28 signal ids; two `signal.semantic.*.explain` keys per language (tier C) |
| `src/pipeline/eval/monster-confusion-samples.ts` (new) | `MC_SAMPLES`: 14 synthetic messages |
| `src/pipeline/monster-confusion.test.ts` (new) | Rules, fake AI old ids, fake AI new ids, direct monster choice, synthetic checks |
| `scripts/run-confusion-probe.ts` (new) | Real-LLM probe, synthetic messages only, prints no raw response |

Why the overlap groups changed: with the new ids inside the old groups, the
AI signals `romance-money-story` and `relationship-or-job-bait` counted as one
group, so the two-group gate at `suspicious` (REQ-PIPE-67) kept the monster
`generic`. Now each new type signal pairs only with the rule signal for the
same evidence. The type signal and the older trust or reward signal count as
two warning signs. Side effect: `text.investment-pitch` plus
`semantic.too-good-to-be-true`, and `text.romance-bait` plus
`semantic.relationship-or-job-bait`, now score as two signals (they scored as
one in `new-monsters-v1`).

Why the tie-break is safe for job scams: `text.job-offer` and
`text.off-platform` carry weight only for `job-bait`. With one of them present
and none of the new ids, `job-bait` is strictly ahead of both new monsters
(PBT-149, revised).

## Diagnosis (before)

Fake AI returns the signals a typical AI layer gives with the six original ids
(`aiOld`). Format: level / monster, score.

| Sample | Wanted | Rules | Fake AI (before) |
|---|---|---|---|
| mc-rom-1 | romance | suspicious / generic, 40 | critical / **job-bait**, 82 |
| mc-rom-2 | romance | no_signals | high / **job-bait**, 70 |
| mc-rom-3 | romance | no_signals | high / **job-bait**, 70 |
| mc-inv-1 | investment | no_signals | high / **generic**, 70 |
| mc-inv-2 | investment | no_signals | high / **job-bait**, 70 |
| mc-inv-3 | investment | suspicious / generic, 40 | critical / **prize**, 82 |
| mc-job-1, mc-job-2 | job-bait | suspicious / generic, 40 | critical / job-bait |
| mc-bank-1 | bank | suspicious / generic, 45 | critical / bank |
| mc-auth-1 | authority | suspicious / generic, 40 | critical / authority |
| mc-ben-1, 2, 4 | none | no_signals | no_signals |
| mc-ben-3 | none | suspicious / generic, 40 | suspicious / generic, 40 |

Wrong monster: 6 of 6 romance and investment samples with the fake AI.

## After

| Sample | Rules | Fake AI, old ids | Fake AI, new ids |
|---|---|---|---|
| mc-rom-1 | high / romance, 61 | critical / romance | critical / romance |
| mc-rom-2, mc-rom-3 | suspicious / generic, 35 | high / romance, 70 | high / romance, 70 |
| mc-inv-1, mc-inv-2 | suspicious / generic, 35 | high / investment, 70 | high / investment, 70 |
| mc-inv-3 | high / investment, 61 | critical / investment | critical / investment |
| mc-job-1, mc-job-2 | unchanged | job-bait | job-bait |
| mc-bank-1, mc-auth-1 | unchanged | bank, authority | bank, authority |
| mc-ben-* | at most suspicious / generic | same | same |

Wrong monster: 0 of 14 in both fake modes. The 75 `EVAL_SAMPLES`, every probe
sample and the 20 `nm-` samples keep their monster and level (the existing
test files pass unchanged apart from the list below).

Real LLM (synthetic messages only, one run, `scripts/run-confusion-probe.ts`):
12 of 14 as wanted.

- `mc-inv-2`: the AI layer returned only `investment-scheme`. Rule and AI signal share one group, so the gate keeps `generic` at `suspicious`.
- `mc-auth-1`: the AI layer returned no signal in this run (an earlier run returned four and the result was `job-bait`, a tie between `job-bait` and `authority` that this spec does not touch).
- `mc-ben-1` (a benign message from someone working on an oil rig): the AI layer raised `romance-money-story`; the result stayed `suspicious` / `generic`.

## Existing tests changed

| Test | Change | Reason |
|---|---|---|
| `semantic-analyzer.config.test.ts` | Eight expected ids, title | Closed id set grew |
| `semantic-monster.v4.test.ts` | "romance-style combination" expects `romance` instead of `job-bait` | Tie on shared signals now goes to `romance` |
| `new-monsters.property.test.ts` PBT-149 | Now: with `text.job-offer` or `text.off-platform`, earlier ids never select a new monster, at `high` and `critical` | REQ-PIPE-74 superseded by the tie-break |
| `new-monsters.property.test.ts` PBT-150 | Pairs are the two new rule and AI pairs | Overlap groups changed |

Accepted recall loss: none. No earlier sample changed.

## Known limits

- If the AI layer returns only one signal, or only signals from one overlap group, the monster stays `generic` at `suspicious` (single-evidence gate).
- A tie between `job-bait` and `authority` still goes to `job-bait` (rules-tuning-v4).
- The AI layer may raise `romance-money-story` or `investment-scheme` on a benign message. The result stays at most `suspicious` and `generic` when it is the only signal.
- The AI layer is not deterministic. The 14 `mc-` samples are not an accuracy estimate.
