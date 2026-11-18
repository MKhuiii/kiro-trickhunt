/**
 * Property tests PBT-81, PBT-82, PBT-83 and PBT-85 (rules-tuning-v3).
 * Rules-only pipeline; no network.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { SEMANTIC_SIGNALS } from "../analyzers/semantic-analyzer.config";
import { TEXT_PATTERNS } from "../analyzers/text-analyzer.config";
import { aggregate, createSignal } from "../core";
import type { Signal, SignalSource } from "../core";
import { KNOWN_SIGNAL_IDS } from "../ui/i18n/signal-ids";

import { applyRules } from "./combine";
import { createPipeline } from "./index";
import { selectMonster } from "./monster";
import { reduceForScoring } from "./reduce";
import { EVAL_SAMPLES } from "./eval/samples";
import { REPUTATION_LISTED_SEVERITY } from "./rules.config";

const pipeline = createPipeline({ llmClient: null });

const AMBIGUOUS_IDS = [
  "text.payment-request",
  "text.otp-request",
  "text.urgency",
  "text.threat",
  "text.authority-impersonation",
  "text.financial-institution",
  "text.job-offer",
  "text.off-platform",
] as const;

const patternOf = (id: string) => {
  const p = TEXT_PATTERNS.find((t) => t.id === id);
  if (!p) throw new Error(`missing pattern ${id}`);
  return p;
};

const sourceOf = (id: string): SignalSource =>
  id.startsWith("url.") ? "url" : id.startsWith("semantic.") ? "semantic" : "text";

function sig(id: string, severity: number): Signal {
  return createSignal({
    id,
    source: sourceOf(id),
    severity,
    evidence: "ev",
    whyItMatters: "because",
  });
}

function verdictOf(signals: readonly Signal[]) {
  const agg = aggregate(reduceForScoring(signals));
  return applyRules(agg, signals);
}

/** Maximum severity of each url signal (url-analyzer.ts). */
const URL_MAX: Readonly<Record<string, number>> = {
  "url.punycode-host": 0.8,
  "url.ip-address-host": 0.7,
  "url.at-in-authority": 0.9,
  "url.excessive-subdomains": 0.5,
  "url.known-shortener": 0.4,
  "url.brand-lookalike": 0.75,
  "url.credential-keywords": 0.45,
  "url.reputation-listed": REPUTATION_LISTED_SEVERITY,
};

function maxSeverityOf(id: string): number {
  if (id.startsWith("text.")) return patternOf(id).weight;
  if (id.startsWith("url.")) return URL_MAX[id];
  const def = SEMANTIC_SIGNALS.find((s) => s.id === id);
  if (!def) throw new Error(`missing semantic ${id}`);
  return def.maxSeverity;
}

const AMBIGUOUS_PHRASES: readonly string[] = AMBIGUOUS_IDS.flatMap((id) => {
  const p = patternOf(id);
  return [...p.phrases.en, ...p.phrases.vi];
});

const BENIGN = EVAL_SAMPLES.filter((s) => s.expectedMonster === null);

const BASE_TEXTS: readonly string[] = [
  ...EVAL_SAMPLES.map((s) => s.text),
  ...AMBIGUOUS_PHRASES,
  ...AMBIGUOUS_PHRASES.map((p) => `Notice: ${p}.`),
];

describe("rules-tuning-v3 precision properties", () => {
  /**
   * PBT-81: a single Ambiguous_Group signal is at most `suspicious`; a phrase
   * that fires exactly one signal gives `suspicious` at most and `generic`.
   * **Validates: Requirements REQ-TXT-26, REQ-PIPE-60, REQ-PIPE-61**
   */
  it("PBT-81: single ambiguous signal is at most suspicious", () => {
    fc.assert(
      fc.property(fc.constantFrom(...AMBIGUOUS_IDS), (id) => {
        const s = sig(id, patternOf(id).weight);
        const { level } = verdictOf([s]);
        expect(["suspicious"]).toContain(level);
      }),
      { numRuns: 100 },
    );
  });

  it("PBT-81: every phrase firing one signal is suspicious at most and generic", async () => {
    expect(AMBIGUOUS_PHRASES.length).toBeGreaterThan(0);
    for (const phrase of AMBIGUOUS_PHRASES) {
      const v = await pipeline.run({ text: phrase });
      if (v.signals.length !== 1) continue;
      expect(["no_signals", "suspicious"], phrase).toContain(v.level);
      expect(["generic", null], phrase).toContain(v.monster);
    }
  });

  /**
   * PBT-82: selectMonster at suspicious gives generic for one ambiguous signal.
   * **Validates: Requirements REQ-PIPE-61**
   */
  it("PBT-82: selectMonster(suspicious, [one ambiguous signal]) is generic", () => {
    fc.assert(
      fc.property(fc.constantFrom(...AMBIGUOUS_IDS), (id) => {
        const s = sig(id, patternOf(id).weight);
        expect(selectMonster("suspicious", [s])).toBe("generic");
      }),
      { numRuns: 100 },
    );
  });

  /**
   * PBT-83: appending a benign sentence never lowers riskScore.
   * **Validates: Requirements REQ-PIPE-61**
   */
  it("PBT-83: appending a benign sentence never lowers riskScore", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...BASE_TEXTS),
        fc.constantFrom(...BENIGN.map((s) => s.text)),
        async (base, benign) => {
          const before = await pipeline.run({ text: base });
          const after = await pipeline.run({ text: `${base} ${benign}` });
          return after.riskScore >= before.riskScore;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * PBT-85: one signal of any known id gives `generic` unless the level is
   * `high` or `critical`.
   * **Validates: Requirements REQ-PIPE-67**
   */
  it("PBT-85: single signal of any known id is generic below high", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...KNOWN_SIGNAL_IDS),
        fc.double({ min: 0.001, max: 1, noNaN: true }),
        (id, unit) => {
          const severity = Math.min(maxSeverityOf(id), Math.max(0.001, unit * maxSeverityOf(id)));
          const s = sig(id, severity);
          const { level } = verdictOf([s]);
          const monster = selectMonster(level, [s]);
          if (level !== "high" && level !== "critical") {
            expect(monster).toBe("generic");
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});
