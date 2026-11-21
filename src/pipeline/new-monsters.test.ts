/**
 * new-monsters-v1: evaluation of the Profit Goblin and Heart Wraith samples.
 * Rules_Mode: createPipeline({ llmClient: null }).
 * Fake_Mode: FakeLlmClient returning the type's semantic signals at 0.45.
 * No network.
 */
import { describe, expect, it } from "vitest";
import { aggregate, createSignal } from "../core";
import type { RiskLevel, Signal } from "../core";
import { FakeLlmClient } from "../analyzers/fake-llm-client";
import { NM_SAMPLES, type NmSample } from "./eval/new-monsters-samples";
import { applyRules } from "./combine";
import { createPipeline } from "./pipeline";
import { COMBINATION_RULES } from "./rules.config";

const RANK: Record<RiskLevel, number> = {
  no_signals: 0,
  suspicious: 1,
  high: 2,
  critical: 3,
};

// Real brands that must never appear in the synthetic set (same list as samples.test.ts).
const REAL_BRANDS = [
  "paypal",
  "amazon",
  "apple",
  "microsoft",
  "google",
  "netflix",
  "facebook",
  "instagram",
  "dhl",
  "fedex",
  "chase",
  "citibank",
  "hsbc",
  "wells fargo",
  "bank of america",
  "vietcombank",
  "techcombank",
  "bidv",
  "vietinbank",
  "mbbank",
  "momo",
  "zalopay",
  "viettel",
  "shopee",
  "lazada",
  "visa",
  "mastercard",
];

const SIGNAL_IDS: Record<"investment" | "romance", readonly string[]> = {
  investment: ["semantic.too-good-to-be-true", "semantic.isolation-secrecy"],
  romance: ["semantic.relationship-or-job-bait", "semantic.pressure-escalation"],
};

function fakeFor(sample: NmSample): FakeLlmClient {
  const ids = sample.kind === "benign" ? [] : SIGNAL_IDS[sample.kind];
  const evidence = sample.text.slice(0, 20);
  return FakeLlmClient.responding(
    JSON.stringify({
      signals: ids.map((id) => ({ id, severity: 0.45, evidence })),
    }),
  );
}

const rulesPipeline = createPipeline({ llmClient: null });

describe("new monsters, Rules_Mode (REQ-PIPE-81, REQ-PIPE-83)", () => {
  for (const sample of NM_SAMPLES) {
    it(sample.id, async () => {
      const v = await rulesPipeline.run({ text: sample.text });
      const got = `level=${v.level} monster=${String(v.monster)}`;
      if (sample.kind === "benign") {
        expect(["no_signals", "suspicious"], got).toContain(v.level);
        expect([null, "generic"], got).toContain(v.monster);
        expect(v.monster === null, got).toBe(v.level === "no_signals");
      } else if (sample.rulesHighMonster) {
        expect(RANK[v.level], got).toBeGreaterThanOrEqual(RANK.high);
        expect(v.monster, got).toBe(sample.expectedMonster);
      } else {
        expect(RANK[v.level], got).toBeGreaterThanOrEqual(RANK[sample.minLevelRules]);
      }
    });
  }
});

describe("new monsters, Fake_Mode (REQ-PIPE-82, REQ-PIPE-83)", () => {
  for (const sample of NM_SAMPLES) {
    it(sample.id, async () => {
      const v = await createPipeline({ llmClient: fakeFor(sample) }).run({
        text: sample.text,
      });
      const got = `level=${v.level} monster=${String(v.monster)}`;
      if (sample.kind === "benign") {
        expect(["no_signals", "suspicious"], got).toContain(v.level);
        expect([null, "generic"], got).toContain(v.monster);
      } else {
        expect(RANK[v.level], got).toBeGreaterThanOrEqual(RANK[sample.minLevelFake]);
        expect(v.monster, got).toBe(sample.expectedMonster);
      }
    });
  }
});

describe("NM_SAMPLES synthetic checks (REQ-PIPE-84)", () => {
  it("has unique ids", () => {
    const ids = NM_SAMPLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has 8 scam and 12 benign samples", () => {
    expect(NM_SAMPLES.filter((s) => s.kind !== "benign")).toHaveLength(8);
    expect(NM_SAMPLES.filter((s) => s.kind === "benign")).toHaveLength(12);
  });

  it("mentions no real brand", () => {
    for (const s of NM_SAMPLES) {
      const text = s.text.toLowerCase();
      for (const brand of REAL_BRANDS) {
        const re = new RegExp(`(^|[^a-z0-9])${brand}([^a-z0-9]|$)`);
        expect(re.test(text), `${s.id} mentions ${brand}`).toBe(false);
      }
    }
  });

  it("contains no digit run of 8 or more", () => {
    for (const s of NM_SAMPLES) {
      expect(/\d{8,}/.test(s.text.replace(/[\s.-]/g, "")), s.id).toBe(false);
    }
  });

  it("contains no URL", () => {
    for (const s of NM_SAMPLES) {
      expect(/https?:\/\/|www\./i.test(s.text), s.id).toBe(false);
    }
  });
});

function sigOf(id: string, severity = 0.1): Signal {
  return createSignal({
    id,
    source: id.startsWith("semantic.") ? "semantic" : "text",
    severity,
    evidence: "ev",
    whyItMatters: "because",
  });
}

function rulesOn(ids: string[]) {
  const signals = ids.map((i) => sigOf(i));
  return applyRules(aggregate(signals), signals);
}

describe("combination rules with payment (REQ-PIPE-76)", () => {
  const cases: Array<[string, string]> = [
    ["investment-with-payment", "text.investment-pitch"],
    ["romance-with-payment", "text.romance-bait"],
  ];
  for (const [ruleId, side] of cases) {
    it(`${ruleId} is configured as minLevel high`, () => {
      const rule = COMBINATION_RULES.find((r) => r.id === ruleId);
      expect(rule?.minLevel).toBe("high");
    });

    it(`${ruleId} fires with both signals`, () => {
      const out = rulesOn([side, "text.payment-request"]);
      expect(RANK[out.level]).toBeGreaterThanOrEqual(RANK.high);
    });

    it(`${ruleId} does not fire with one side alone`, () => {
      expect(RANK[rulesOn([side]).level]).toBeLessThan(RANK.high);
      expect(RANK[rulesOn(["text.payment-request"]).level]).toBeLessThan(RANK.high);
    });
  }
});

describe("single semantic signal, Fake_Mode (REQ-TXT-33, REQ-PIPE-73)", () => {
  const benign = NM_SAMPLES.filter((s) => s.kind === "benign");
  const ids = [...SIGNAL_IDS.investment, ...SIGNAL_IDS.romance];
  for (const id of ids) {
    it(`${id} alone gives at most suspicious and generic`, async () => {
      for (const sample of benign) {
        // Only samples with no rule signal: the semantic signal must be the only one.
        const base = await rulesPipeline.run({ text: sample.text });
        if (base.level !== "no_signals") continue;
        const client = FakeLlmClient.responding(
          JSON.stringify({
            signals: [{ id, severity: 0.45, evidence: sample.text.slice(0, 20) }],
          }),
        );
        const v = await createPipeline({ llmClient: client }).run({ text: sample.text });
        const got = `${sample.id} level=${v.level} monster=${String(v.monster)}`;
        expect(["no_signals", "suspicious"], got).toContain(v.level);
        expect([null, "generic"], got).toContain(v.monster);
      }
    });
  }
});



