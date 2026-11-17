# Rules tuning v5: status (in progress)

All messages are synthetic. This document records what is done, what was measured, and what is blocked.

## Blocker: LLM daily token limit

The LLM provider allows **200,000 tokens per day** for this key. The provider's error said: "Rate limit reached ... tokens per day (TPD): Limit 200000, Used 199871". The baseline run (110 messages × 3 runs, about 330 calls) used almost all of it. In the next run (`message-probe-2026-11-17-all-v5-hints.md`), 80 of 92 LLM calls failed with `client-error`. **That report's LLM column is not valid.** Those rows show the rules-only result. A single call with the new prompt works (`scripts/smoke-llm.ts`: status ok), so the failures came from the quota, not from the prompt.

A full run at `--repeat 3` on all 110 messages needs about 260k tokens. That is more than one day's limit.

## Done

| Task | State | Evidence |
|---|---|---|
| 1. Holdout 2 (16), evasion set (27), `--repeat`, `--set holdout2/evasion/all`, `--awareness on/off` | Done | `probe-samples.ts`, `probe-report.ts`, script; tests in `probe-samples.test.ts`, `probe-report.test.ts` |
| Baseline, rules-only, all sets | Done | `*-before-v5.md` (main, holdout, holdout2, evasion) |
| Baseline, LLM ×3, all sets | Done, valid | `message-probe-2026-11-17-all-before-v5-llm.md` (91 PASS, 9 FAIL, 10 FALSE_ALARM) |
| 2. Narrow prize phrases | Done, verified (rules are deterministic) | `look-en-5`, `look-vi-4` no longer `high/prize`. All 75 eval samples pass. `KNOWN_FALSE_ALARMS` is now only `look-en-2` |
| 3. Per-id hints in the prompt | Code done, **not measured** | `semantic-analyzer.config.ts` (`hint`, `PROMPT_GUIDANCE`); prompt tests |
| 4. Two new semantic ids | **Not started.** The decision needs the Task 3 measurement | Baseline: 4/4 holdout bank messages are `authority` and 4/4 holdout prize messages are `generic`, so the condition is likely to be met |
| 5. Awareness adjustment | Code and tests done. **Switched off** (`AWARENESS_ADJUSTMENT_ENABLED = false`) until 6c passes | `awareness.config.ts`, `awareness.ts`, pipeline, `LIMITATIONS_AWARENESS`, steering updates |
| 6a. Fully fooled LLM | Done, passes | `awareness.pipeline.test.ts`: a fake LLM that marks every one of 86 scam samples as a warning at full strength lowers none of them |
| 6b. Evasion set | Done | 21 evasion scams and 6 genuine warnings |
| 6c. Live review with the real LLM | **Blocked by the quota** | |
| 7. README and final report | Waiting for 6c | |

## What the rules alone show for the adjustment

With a marker from the LLM, only messages at `high` can be lowered. Among all probe messages that the rules rate `high`:

- **Would be lowered:** `look-en-2`, `ev-real-en-1`, `ev-real-vi-1`. All three are genuine warnings.
- **Blocked (all scams):** prize scams have no warning cue. `ev-courier-en-1` and `ev-arrest-en-1` are blocked by "act now". `ev-link-en-1` has a link. `ev-power-vi-1` has a command ("hãy đến").

With the real LLM the picture can change in two ways. LLM signals can raise more messages to `high`, which gives the adjustment more to consider. Any semantic warning sign blocks the adjustment. Only a live run shows the net effect.

## Proposed measurement plan within the quota

The estimate is about 600 to 850 tokens per call, so about 230 to 260 calls per day.

- **Day 1:**
  - Task 3 gate, `--awareness off --repeat 1` on all 110 messages: 110 calls.
  - Task 6c, `--awareness on --repeat 3` on the evasion set: 81 calls.
  - Total about 190 calls.
- **Day 2 (if Task 4 is needed):**
  - Task 4 change, then `--repeat 1` on all 110 messages, awareness on: 110 calls.
  - `--repeat 3` on holdout and holdout 2: 90 calls.

Other options: use a second key or a higher tier, or point `LLM_BASE_URL` at a local model.
