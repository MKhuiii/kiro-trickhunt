# Rules tuning v4: before and after

Follows the suggestions in [message-probe-2026-11-17-analysis.md](./message-probe-2026-11-17-analysis.md) (items 1 to 4). All messages are synthetic.

## What changed

- `src/analyzers/text-analyzer.config.ts`: added phrases to `otp-request`, `financial-institution`, `sensitive-data-request`, `threat`, `authority-impersonation`, `prize-reward`, `job-offer`, `payment-request` and `off-platform`. Weights are unchanged.
- `src/pipeline/monsters.config.ts`: `semantic.emotional-manipulation` now counts 1 toward `job-bait`.
- One phrase was tried and removed: `nhận ngay voucher`. It raised a real store promotion (`h-look-vi-2`) to `high/prize`.
- Nothing else in `src/pipeline`, `src/core` or the analyzers' logic changed.

Two message sets were used:

- **Main set** (53 messages): the set the phrases were chosen from. Results here are optimistic.
- **Holdout set** (14 messages): written before the config change, with different wording, and never used to pick phrases. This is the fairer test of whether the change generalizes.

## Main set

| Category | Rules-only before | Rules-only after | Rules + LLM before | Rules + LLM after |
|---|---|---|---|---|
| rare-scam (17) | 2 PASS, 15 FAIL | **15 PASS, 2 FAIL** | 10 PASS, 7 FAIL | **17 PASS** |
| out-of-scope-scam (10) | 10 GAP | 10 GAP | 10 PASS | 10 PASS |
| benign (12) | 12 PASS | 12 PASS | 12 PASS | 12 PASS |
| lookalike (14) | 11 PASS, 3 FALSE_ALARM | 11 PASS, 3 FALSE_ALARM | 9 PASS, 5 FALSE_ALARM | 9 PASS, 5 FALSE_ALARM |

- The two rules-only failures that remain are `rare-job-en-2` (equipment deposit) and `rare-job-en-3` (romance). Both are caught by the LLM.
- `rare-job-en-3` changed from `critical/authority` to `critical/job-bait` with the LLM, which is the effect of the `emotional-manipulation` weight.
- `oos-family-en` changed from `authority` to `job-bait` with the LLM. This sample expects `generic`, so it still passes.
- No benign or lookalike message changed result. The false alarms are the same as before: `look-en-2`, `look-en-5`, `look-vi-4` (rules) plus `look-en-8` and `look-vi-2` (added by the LLM).

## Holdout set

| Category | Rules-only before | Rules-only after | Rules + LLM after |
|---|---|---|---|
| rare-scam (8) | 0 PASS, 8 FAIL | **0 PASS, 8 FAIL** | 4 PASS, 4 FAIL |
| benign (2) | 2 PASS | 2 PASS | 2 PASS |
| lookalike (4) | 4 PASS | 4 PASS | 4 PASS |

With the LLM, the holdout passes are `h-job-en-1`, `h-job-vi-1`, `h-auth-en-1` and `h-auth-vi-1`. The failures are `h-bank-en-1` and `h-bank-vi-1` (`high/authority`) and `h-prize-en-1` and `h-prize-vi-1` (`high/generic`).

## What this means

1. **The phrase additions do not generalize.** They lift the main set from 2 to 15 of 17 rare scams, but the holdout stays at 0 of 8 rules-only (one message moved from no signal to `suspicious`). The main-set gain mostly reflects the wording of those exact messages, so it overstates the real improvement. Expect the same pattern for any phrase list built from known examples.
2. **No new false alarms.** All benign and lookalike messages, including the holdout promotion, planned outage and awareness messages, stay at `suspicious` or below. The regression test `probe-regression.test.ts` now locks in the 15 rules-only passes and blocks new false alarms.
3. **The `emotional-manipulation` weight is safe on this data** and fixes the romance sample. It is kept.
4. **The same two weaknesses appear with the LLM on unseen messages.** Bank phishing is labelled `authority` and prize lures `generic`, as in the main set before the change. The phrase additions cannot fix that when the wording is new, because the cause is how monster points are counted for semantic signals.
5. **LLM runs vary.** The provider failed on 28 of 52 calls in the first run of the earlier probe. The script now retries. In the runs used here no call ended degraded.

## What remains

| Issue | Evidence | Option |
|---|---|---|
| Bank phishing with new wording is labelled `authority` with the LLM | `h-bank-en-1`, `h-bank-vi-1` | Add a semantic signal for credential or code requests to the allowed LLM ids, with a weight for `bank`. This changes the closed signal set and the LLM prompt, so it needs its own spec. |
| Prize lures with new wording stay `generic` with the LLM | `h-prize-en-1`, `h-prize-vi-1` | Raising the `prize` weight for `too-good-to-be-true` would also make job scams tie with `prize`, and `prize` wins ties. Test before changing. |
| Rules-only recall on unfamiliar wording | holdout 0 of 8 | Structural signals (a request for a code plus a bank context) instead of phrases. Needs a design decision. |
| `look-en-5`, `look-vi-4` (a raffle prize and a real job acceptance) rated `high/prize` | main set | Split weak prize phrases into a lower-weight pattern (suggestion 6 in the analysis). Not done in this round. |
| `look-en-8`, `look-vi-2` raised only when the LLM runs | main set | Lower `maxSeverity` of `semantic.pressure-escalation` and `semantic.relationship-or-job-bait` (suggestion 5). Not done in this round. |
| `look-en-2` (anti-scam notice quoting scam wording) rated `high` | main set | Cannot be lowered by a rule under `verdict-rules.md`. |

## Files

Reports: `message-probe-2026-11-17-before.md`, `-final.md`, `-holdout-before.md`, `-holdout-final.md` (rules-only), and `-all-phrases-only.md`, `-all-after.md` (rules + LLM). The report without a label is the first run, before the work in this document.
