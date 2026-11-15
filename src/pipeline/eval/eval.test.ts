/**
 * Evaluation test (REQ-PIPE-46): one test per sample, rules-only pipeline.
 * Scam_Sample: monster === expectedMonster and level rank >= minLevel.
 * Benign_Sample: Benign_Pass (no_signals or suspicious; monster null or generic).
 */

import { describe, expect, it } from "vitest";
import type { RiskLevel } from "../../core";
import { createPipeline } from "../index";
import { EVAL_SAMPLES } from "./samples";

const RANK: Record<RiskLevel, number> = {
  no_signals: 0,
  suspicious: 1,
  high: 2,
  critical: 3,
};

const pipeline = createPipeline({ llmClient: null });

describe("rules-only evaluation set", () => {
  for (const sample of EVAL_SAMPLES) {
    it(`${sample.id}`, async () => {
      const verdict = await pipeline.run({ text: sample.text });
      const got = `level=${verdict.level} monster=${String(verdict.monster)}`;

      if (sample.expectedMonster !== null) {
        expect(verdict.monster, got).toBe(sample.expectedMonster);
        expect(RANK[verdict.level], got).toBeGreaterThanOrEqual(RANK[sample.minLevel]);
      } else {
        expect(["no_signals", "suspicious"], got).toContain(verdict.level);
        expect([null, "generic"], got).toContain(verdict.monster);
        // Batch 2 benign samples must stay fully clean (rules-tuning-v2).
        if (sample.id.startsWith("b2-")) {
          expect(verdict.level, got).toBe("no_signals");
          expect(verdict.monster, got).toBeNull();
        }
      }
    });
  }
});
