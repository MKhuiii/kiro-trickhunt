/**
 * reputation.score.property.test.ts — PBT-121: the aggregator and the rules
 * own the score, with or without a reputation result.
 *
 * Feature: link-reputation-check, Property 121: The aggregator and the rules
 * own the score
 *
 * **Validates: Requirements REQ-LREP-31, REQ-LREP-32, REQ-LREP-33,
 * REQ-LREP-34, REQ-LREP-37, REQ-LREP-38**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

import { aggregate } from "../core";
import type {
  ReputationChecker,
  ReputationHit,
  ReputationResult,
} from "../analyzers/reputation-checker";
import { REPUTATION_LISTED_SIGNAL_ID } from "../analyzers/reputation-checker";
import { TEXT_PATTERNS } from "../analyzers/text-analyzer.config";

import { applyRules } from "./combine";
import { LIMITATIONS_REPUTATION } from "./messages.config";
import { createPipeline } from "./pipeline";
import { reduceForScoring } from "./reduce";
import type { Locale, RiskLevel } from "./verdict";

const RUNS = 100;
const ORDER: readonly RiskLevel[] = ["no_signals", "suspicious", "high", "critical"];
const rank = (l: RiskLevel): number => ORDER.indexOf(l);

const phrases: string[] = TEXT_PATTERNS.flatMap((p) => [...p.phrases.en, ...p.phrases.vi]);
const CATEGORIES: ReputationHit["category"][] = [
  "social-engineering",
  "malware",
  "unwanted-software",
  "other",
];

function fakeChecker(result: ReputationResult): ReputationChecker {
  return { check: async () => result };
}

interface Case {
  readonly text: string;
  readonly urls: string[];
  readonly hits: ReputationHit[];
  readonly degraded: boolean;
  readonly locale: Locale;
}

const caseArb: fc.Arbitrary<Case> = fc
  .tuple(
    fc.array(fc.oneof(fc.constantFrom(...phrases), fc.constantFrom("hello", "please", "now")), {
      maxLength: 6,
    }),
    fc.integer({ min: 1, max: 4 }),
    fc.array(fc.tuple(fc.nat(), fc.constantFrom(...CATEGORIES)), { maxLength: 6 }),
    fc.boolean(),
    fc.constantFrom<Locale>("en", "vi"),
  )
  .map(([words, urlCount, rawHits, degraded, locale]) => {
    const urls = Array.from(
      { length: urlCount },
      (_, i) => `https://host${i}.example.com/path${i}?q=1`,
    );
    const hits = rawHits.map(([n, category]) => ({ url: urls[n % urls.length], category }));
    return { text: words.join(" "), urls, hits, degraded, locale };
  });

describe("PBT-121: the aggregator and the rules own the score", () => {
  it("score and level equal aggregate plus applyRules of the final signals; a listing floors at high and never lowers; no listing equals no checker", async () => {
    await fc.assert(
      fc.asyncProperty(caseArb, async (c) => {
        const input = { text: c.text, urls: c.urls };
        const result: ReputationResult = c.degraded
          ? { status: "degraded", reason: "provider-error" }
          : { status: "ok", hits: c.hits, checkedCount: c.urls.length };

        const base = await createPipeline({ llmClient: null, locale: c.locale }).run(input);
        const v = await createPipeline({
          llmClient: null,
          locale: c.locale,
          reputationChecker: fakeChecker(result),
        }).run(input);

        // Score ownership.
        const expected = applyRules(aggregate(reduceForScoring(v.signals)), v.signals);
        expect(v.riskScore).toBeCloseTo(expected.score, 9);
        expect(v.level).toBe(expected.level);

        const listing = v.signals.filter((s) => s.id === REPUTATION_LISTED_SIGNAL_ID);
        const distinctHosts = new Set(
          (c.degraded ? [] : c.hits).map((h) => new URL(h.url).hostname),
        );
        const reputationLimitation = LIMITATIONS_REPUTATION[c.locale][0];
        const count = v.limitations.filter((t) => t === reputationLimitation).length;

        if (listing.length === 0) {
          expect(distinctHosts.size === 0 || c.degraded).toBe(true);
          expect(v.riskScore).toBe(base.riskScore);
          expect(v.level).toBe(base.level);
          expect(v.monster).toEqual(base.monster);
          expect(v.signals).toEqual(base.signals);
          expect(v.actions).toEqual(base.actions);
          expect(v.limitations).toEqual(base.limitations);
          expect(count).toBe(0);
          expect(v.reputation.status).toBe(c.degraded ? "degraded" : "ok");
        } else {
          expect(listing).toHaveLength(distinctHosts.size);
          expect(rank(v.level)).toBeGreaterThanOrEqual(rank("high"));
          expect(rank(v.level)).toBeGreaterThanOrEqual(rank(base.level));
          expect(v.riskScore).toBeGreaterThanOrEqual(base.riskScore);
          expect(count).toBe(1);
        }
      }),
      { numRuns: RUNS },
    );
  });
});
