/**
 * Regression test for rules-tuning-v4: runs the probe sets through the
 * rules-only pipeline (no network) and locks in the improvements, without
 * allowing new false alarms. Messages that depend on the LLM are not asserted.
 */

import { describe, expect, it } from "vitest";
import { createPipeline } from "../index";
import { evaluateSample, toObserved } from "./probe-report";
import { PROBE_HOLDOUT_SAMPLES, PROBE_SAMPLES } from "./probe-samples";
import type { ProbeSample } from "./probe-samples";

const pipeline = createPipeline({ llmClient: null });

async function statusOf(sample: ProbeSample): Promise<string> {
  const verdict = await pipeline.run({ text: sample.text });
  const e = evaluateSample(sample, toObserved(verdict));
  return `${e.status} ${verdict.level}/${String(verdict.monster)} ${e.note}`.trim();
}

/** Rare scams the rules must now catch without the LLM. */
const MUST_PASS_RULES_ONLY = [
  "rare-bank-en-1",
  "rare-bank-en-2",
  "rare-bank-vi-1",
  "rare-bank-vi-2",
  "rare-prize-en-1",
  "rare-prize-en-2",
  "rare-prize-vi-1",
  "rare-prize-vi-2",
  "rare-job-en-1",
  "rare-job-vi-1",
  "rare-job-vi-2",
  "rare-auth-en-1",
  "rare-auth-en-2",
  "rare-auth-vi-1",
  "rare-auth-vi-2",
];

/** Known false alarms of the rules (see the analysis report). Do not add to this list. */
const KNOWN_FALSE_ALARMS = new Set(["look-en-2"]);

describe("probe regression, rules-only", () => {
  for (const id of MUST_PASS_RULES_ONLY) {
    it(`${id} is caught by the rules alone`, async () => {
      const sample = PROBE_SAMPLES.find((s) => s.id === id);
      expect(sample, id).toBeDefined();
      const got = await statusOf(sample!);
      expect(got.startsWith("PASS"), got).toBe(true);
    });
  }

  it("harmless main-set messages raise no new false alarm", async () => {
    const harmless = PROBE_SAMPLES.filter(
      (s) => s.category === "benign" || s.category === "lookalike",
    );
    for (const s of harmless) {
      const got = await statusOf(s);
      if (KNOWN_FALSE_ALARMS.has(s.id)) continue;
      expect(got.startsWith("PASS"), `${s.id}: ${got}`).toBe(true);
    }
  });

  it("harmless holdout messages raise no false alarm", async () => {
    const harmless = PROBE_HOLDOUT_SAMPLES.filter((s) => s.category !== "rare-scam");
    for (const s of harmless) {
      const got = await statusOf(s);
      expect(got.startsWith("PASS"), `${s.id}: ${got}`).toBe(true);
    }
  });
});
