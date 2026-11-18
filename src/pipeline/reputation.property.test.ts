import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type {
  ReputationCategory,
  ReputationChecker,
  ReputationHit,
  ReputationResult,
} from "../analyzers/reputation-checker";

import { listingSignals, runReputation } from "./reputation";

// Feature: link-reputation-check, Property 120: Listed means full-hash equality
// (pipeline part: runReputation never rejects, one signal per host, evidence
// free of path, query, fragment and userinfo)
// **Validates: Requirements REQ-LREP-05, REQ-LREP-30, REQ-LREP-38**

const categoryArb: fc.Arbitrary<ReputationCategory> = fc.constantFrom(
  "social-engineering",
  "malware",
  "unwanted-software",
  "other",
);

const hostArb = fc
  .integer({ min: 0, max: 5 })
  .map((n) => `h${n}.example`);

const markerArb = fc.constantFrom("zzpath", "zzquery", "zzfrag", "zzuser", "zzpass");

const hitArb: fc.Arbitrary<ReputationHit> = fc
  .record({
    host: hostArb,
    path: markerArb,
    query: markerArb,
    frag: markerArb,
    user: markerArb,
    pass: markerArb,
    withUserinfo: fc.boolean(),
    category: categoryArb,
  })
  .map((r) => ({
    url: `https://${r.withUserinfo ? `${r.user}:${r.pass}@` : ""}${r.host}/${r.path}/x?q=${r.query}#${r.frag}`,
    category: r.category,
  }));

const garbageArb = fc.constantFrom<unknown>(
  undefined,
  null,
  42,
  "text",
  {},
  { status: "ok" },
  { status: "ok", hits: "no", checkedCount: 1 },
  { status: "ok", hits: [null, 3, { url: 1 }], checkedCount: 1 },
  { status: "degraded", reason: "weird" },
);

type Behaviour =
  | { kind: "ok"; hits: ReputationHit[]; checkedCount: number }
  | { kind: "degraded" }
  | { kind: "throws" }
  | { kind: "rejects" }
  | { kind: "garbage"; value: unknown };

const behaviourArb: fc.Arbitrary<Behaviour> = fc.oneof(
  fc.record({
    kind: fc.constant("ok" as const),
    hits: fc.array(hitArb, { maxLength: 12 }),
    checkedCount: fc.nat({ max: 50 }),
  }),
  fc.constant({ kind: "degraded" as const }),
  fc.constant({ kind: "throws" as const }),
  fc.constant({ kind: "rejects" as const }),
  garbageArb.map((value) => ({ kind: "garbage" as const, value })),
);

function checkerFor(b: Behaviour): ReputationChecker {
  return {
    check: (): Promise<ReputationResult> => {
      switch (b.kind) {
        case "ok":
          return Promise.resolve({
            status: "ok",
            hits: b.hits,
            checkedCount: b.checkedCount,
          });
        case "degraded":
          return Promise.resolve({ status: "degraded", reason: "provider-error" });
        case "throws":
          throw new Error("boom");
        case "rejects":
          return Promise.reject(new Error("boom"));
        case "garbage":
          return Promise.resolve(b.value as ReputationResult);
      }
    },
  };
}

const FORBIDDEN = ["zzpath", "zzquery", "zzfrag", "zzuser", "zzpass", "https", "/", "?", "#", "@"];

describe("PBT-120 runReputation and listingSignals", () => {
  it("never rejects, and signals are one per host with clean evidence", async () => {
    await fc.assert(
      fc.asyncProperty(
        behaviourArb,
        fc.constantFrom("en", "vi") as fc.Arbitrary<"en" | "vi">,
        async (behaviour, locale) => {
          const run = await runReputation(
            checkerFor(behaviour),
            ["https://h0.example/"],
            1000,
            locale,
          );
          expect(["ok", "degraded"]).toContain(run.outcome.status);
          if (run.outcome.status === "degraded") {
            expect(run.signals).toEqual([]);
          }
          const hosts = run.signals.map((s) => s.evidence.split(" ")[0]);
          expect(new Set(hosts).size).toBe(hosts.length);
          for (const s of run.signals) {
            expect(s.id).toBe("url.reputation-listed");
            expect(s.evidence).toMatch(/^h\d\.example \(.+\)$/);
            for (const bad of FORBIDDEN) expect(s.evidence).not.toContain(bad);
          }
          if (behaviour.kind === "ok") {
            const expected = new Set(
              behaviour.hits.map((h) => new URL(h.url).hostname),
            );
            expect(new Set(hosts)).toEqual(expected);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("listingSignals gives exactly one signal per distinct host", () => {
    fc.assert(
      fc.property(fc.array(hitArb, { maxLength: 20 }), (hits) => {
        const signals = listingSignals(hits, "en");
        const distinct = new Set(hits.map((h) => new URL(h.url).hostname));
        expect(signals).toHaveLength(distinct.size);
        for (const s of signals) {
          for (const bad of FORBIDDEN) expect(s.evidence).not.toContain(bad);
        }
      }),
      { numRuns: 200 },
    );
  });
});
