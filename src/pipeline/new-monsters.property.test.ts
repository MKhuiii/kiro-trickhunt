/**
 * new-monsters-v1 property tests PBT-145, PBT-146, PBT-149, PBT-150.
 * Rules_Mode only. No network.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { aggregate, createSignal } from "../core";
import type { RiskLevel, Signal } from "../core";
import { TEXT_PATTERNS } from "../analyzers/text-analyzer.config";
import { applyRules } from "./combine";
import { NM_SAMPLES } from "./eval/new-monsters-samples";
import { EVAL_SAMPLES } from "./eval/samples";
import { MONSTERS } from "./monsters.config";
import { selectMonster } from "./monster";
import { OVERLAP_GROUPS } from "./overlap.config";
import { createPipeline } from "./pipeline";
import { reduceForScoring } from "./reduce";
import { COMBINATION_RULES } from "./rules.config";

const NEW_TEXT_IDS = ["text.investment-pitch", "text.romance-bait"] as const;
const LEVELS: readonly RiskLevel[] = ["no_signals", "suspicious", "high", "critical"];

const pipeline = createPipeline({ llmClient: null });

function sig(id: string, severity: number): Signal {
  return createSignal({
    id,
    source: id.startsWith("semantic.") ? "semantic" : "text",
    severity,
    evidence: "ev",
    whyItMatters: "because",
  });
}

describe("new-monsters-v1 properties", () => {
  /**
   * PBT-145: one New_Text_Signal alone gives at most suspicious and generic.
   * **Validates: Requirements REQ-TXT-33, REQ-PIPE-73**
   */
  it("PBT-145: a single new text signal gives suspicious at most and generic", () => {
    fc.assert(
      fc.property(fc.constantFrom(...NEW_TEXT_IDS), (id) => {
        const weight = TEXT_PATTERNS.find((p) => p.id === id)?.weight ?? NaN;
        const signals = reduceForScoring([sig(id, weight)]);
        const out = applyRules(aggregate(signals), signals);
        expect(["no_signals", "suspicious"]).toContain(out.level);
        expect(selectMonster(out.level, signals)).not.toBe("investment");
        expect(selectMonster(out.level, signals)).not.toBe("romance");
        expect([null, "generic"]).toContain(selectMonster(out.level, signals));
      }),
      { numRuns: 100 },
    );
  });

  it("PBT-145: every phrase of the two groups, alone, stays suspicious and generic", async () => {
    let checked = 0;
    for (const id of NEW_TEXT_IDS) {
      const group = TEXT_PATTERNS.find((p) => p.id === id);
      expect(group, id).toBeDefined();
      for (const phrase of [...group!.phrases.en, ...group!.phrases.vi]) {
        const v = await pipeline.run({ text: phrase });
        if (v.signals.length !== 1) continue;
        checked++;
        const got = `${phrase} -> level=${v.level} monster=${String(v.monster)}`;
        expect(["no_signals", "suspicious"], got).toContain(v.level);
        expect([null, "generic"], got).toContain(v.monster);
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  /**
   * PBT-146: appending a benign sentence never lowers riskScore.
   * **Validates: Requirements REQ-TXT-33**
   */
  it("PBT-146: appending a benign sentence never lowers riskScore", async () => {
    const phrases = TEXT_PATTERNS.filter((p) =>
      (NEW_TEXT_IDS as readonly string[]).includes(p.id),
    ).flatMap((p) => [...p.phrases.en, ...p.phrases.vi]);
    const bases = [...NM_SAMPLES.map((s) => s.text), ...phrases, ...phrases.map((p) => `Notice: ${p}.`)];
    const benign = [
      ...NM_SAMPLES.filter((s) => s.kind === "benign").map((s) => s.text),
      ...EVAL_SAMPLES.filter((s) => s.expectedMonster === null).map((s) => s.text),
    ];
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...bases),
        fc.constantFrom(...benign),
        async (base, extra) => {
          const before = await pipeline.run({ text: base });
          const after = await pipeline.run({ text: `${base} ${extra}` });
          return after.riskScore >= before.riskScore;
        },
      ),
      { numRuns: 200 },
    );
  });

  /**
   * PBT-149 (revised by monster-disambiguation-v1): `investment` and `romance`
   * now come before `job-bait` in MONSTER_ORDER, so a tie on shared earlier ids
   * goes to them. A job-bait-only signal (`text.job-offer` or `text.off-platform`)
   * still makes `job-bait` strictly higher, so with one of them present and
   * no new ids, neither new monster is chosen at `high` or `critical`.
   * **Validates: Requirements REQ-PIPE-74 (superseded), REQ-DIS-05**
   */
  it("PBT-149: with a job-bait-only signal, earlier ids never select investment or romance", () => {
    const all = new Set<string>([
      ...TEXT_PATTERNS.map((p) => p.id),
      ...MONSTERS.flatMap((m) => Object.keys(m.weights)),
      ...OVERLAP_GROUPS.flat(),
      ...COMBINATION_RULES.flatMap((r) => r.allOf.flat()),
    ]);
    const newIds = new Set<string>([
      ...NEW_TEXT_IDS,
      "semantic.romance-money-story",
      "semantic.investment-scheme",
    ]);
    const earlier = [...all].filter((id) => !newIds.has(id));
    expect(earlier.length).toBeGreaterThan(10);
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...earlier), { maxLength: 30 }),
        fc.constantFrom("text.job-offer", "text.off-platform"),
        fc.constantFrom<RiskLevel>("high", "critical"),
        (ids, jobOnly, level) => {
          const m = selectMonster(level, [...ids, jobOnly].map((id) => sig(id, 0.3)));
          return m !== "investment" && m !== "romance";
        },
      ),
      { numRuns: 500 },
    );
  });

  /**
   * PBT-150: overlap pairs reduce to exactly the stronger signal.
   * **Validates: Requirements REQ-PIPE-75**
   */
  it("PBT-150: overlap pairs reduce to the stronger signal", () => {
    // monster-disambiguation-v1 changed the groups: each new type signal pairs
    // with its own AI signal only. The older pairs (investment-pitch with
    // too-good-to-be-true, romance-bait with relationship-or-job-bait) are
    // two separate warning signs now.
    const pairs: ReadonlyArray<readonly [string, string]> = [
      ["text.investment-pitch", "semantic.investment-scheme"],
      ["text.romance-bait", "semantic.romance-money-story"],
    ];
    const severity = fc.double({ min: 0.001, max: 0.45, noNaN: true });
    fc.assert(
      fc.property(
        fc.constantFrom(...pairs),
        severity,
        severity,
        fc.boolean(),
        (pair, a, b, swap) => {
          fc.pre(a !== b);
          const list = [sig(pair[0], a), sig(pair[1], b)];
          const out = reduceForScoring(swap ? [...list].reverse() : list);
          const stronger = a > b ? list[0] : list[1];
          return out.length === 1 && out[0].id === stronger.id && out[0].severity === stronger.severity;
        },
      ),
      { numRuns: 200 },
    );
  });
});
