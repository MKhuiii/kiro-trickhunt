/**
 * monster-disambiguation-v1: the confusion set, in Rules_Mode and with a fake
 * AI layer (six original ids = "old", plus the two new ids = "new"), and direct
 * checks of the monster choice. No network.
 */
import { describe, expect, it } from "vitest";
import { createSignal } from "../core";
import type { RiskLevel, Signal } from "../core";
import { FakeLlmClient } from "../analyzers/fake-llm-client";
import { MC_SAMPLES, type McSample } from "./eval/monster-confusion-samples";
import { selectMonster } from "./monster";
import { createPipeline } from "./pipeline";

const RANK: Record<RiskLevel, number> = {
  no_signals: 0,
  suspicious: 1,
  high: 2,
  critical: 3,
};

const REAL_BRANDS = [
  "paypal", "amazon", "apple", "microsoft", "google", "netflix", "facebook",
  "instagram", "dhl", "fedex", "chase", "citibank", "hsbc", "wells fargo",
  "bank of america", "vietcombank", "techcombank", "bidv", "vietinbank",
  "mbbank", "momo", "zalopay", "viettel", "shopee", "lazada", "visa", "mastercard",
];

function fake(ids: readonly string[], text: string): FakeLlmClient {
  return FakeLlmClient.responding(
    JSON.stringify({
      signals: ids.map((id) => ({ id, severity: 0.45, evidence: text.slice(0, 20) })),
    }),
  );
}

function sig(id: string, severity = 0.3): Signal {
  return createSignal({
    id,
    source: id.startsWith("semantic.") ? "semantic" : "text",
    severity,
    evidence: "ev",
    whyItMatters: "because",
  });
}

const rulesPipeline = createPipeline({ llmClient: null });

function checkResult(sample: McSample, v: { level: RiskLevel; monster: string | null }, scamMinLevel: RiskLevel) {
  const got = `${sample.id} level=${v.level} monster=${String(v.monster)}`;
  if (sample.expectedMonster === null) {
    expect(["no_signals", "suspicious"], got).toContain(v.level);
    expect([null, "generic"], got).toContain(v.monster);
  } else {
    expect(RANK[v.level], got).toBeGreaterThanOrEqual(RANK[scamMinLevel]);
    expect(v.monster, got).toBe(sample.expectedMonster);
  }
}

describe("confusion set, Rules_Mode", () => {
  // Rules alone cannot name every type (the matcher has no wildcard), but they
  // must never name a wrong monster. These two reach `high` through phrases.
  const RULES_HIGH = new Set(["mc-rom-1", "mc-inv-3"]);
  for (const sample of MC_SAMPLES) {
    it(sample.id, async () => {
      const v = await rulesPipeline.run({ text: sample.text });
      const got = `level=${v.level} monster=${String(v.monster)}`;
      if (RULES_HIGH.has(sample.id)) {
        expect(RANK[v.level], got).toBeGreaterThanOrEqual(RANK.high);
        expect(v.monster, got).toBe(sample.expectedMonster);
      } else if (sample.expectedMonster === null) {
        expect(["no_signals", "suspicious"], got).toContain(v.level);
        expect([null, "generic"], got).toContain(v.monster);
      } else {
        // Never a wrong specific monster.
        expect([sample.expectedMonster, "generic", null], got).toContain(v.monster);
      }
    });
  }
});

describe("confusion set, fake AI with the six original ids", () => {
  for (const sample of MC_SAMPLES) {
    it(sample.id, async () => {
      const v = await createPipeline({ llmClient: fake(sample.aiOld, sample.text) }).run({
        text: sample.text,
      });
      checkResult(sample, v, "high");
    });
  }
});

describe("confusion set, fake AI with the two new ids", () => {
  for (const sample of MC_SAMPLES) {
    it(sample.id, async () => {
      const v = await createPipeline({ llmClient: fake(sample.aiNew, sample.text) }).run({
        text: sample.text,
      });
      checkResult(sample, v, "high");
    });
  }
});

describe("monster choice from signal ids alone (no text phrase)", () => {
  const pick = (level: RiskLevel, ids: string[]) =>
    selectMonster(level, ids.map((id) => sig(id)));

  it("romance story plus payment names romance", () => {
    expect(
      pick("high", ["semantic.romance-money-story", "text.payment-request"]),
    ).toBe("romance");
  });

  it("investment scheme plus pressure names investment", () => {
    expect(
      pick("high", ["semantic.investment-scheme", "semantic.pressure-escalation"]),
    ).toBe("investment");
  });

  it("tie on shared ids (relationship, emotional, payment) goes to romance", () => {
    expect(
      pick("high", [
        "semantic.relationship-or-job-bait",
        "semantic.emotional-manipulation",
        "text.payment-request",
      ]),
    ).toBe("romance");
  });

  it("tie on shared ids (too-good, isolation, payment) goes to investment, not job-bait", () => {
    expect(
      pick("high", [
        "semantic.too-good-to-be-true",
        "semantic.isolation-secrecy",
        "text.payment-request",
      ]),
    ).toBe("investment");
  });

  it("a job-offer or off-platform signal keeps job-bait ahead", () => {
    for (const jobOnly of ["text.job-offer", "text.off-platform"]) {
      expect(
        pick("high", [
          "semantic.relationship-or-job-bait",
          "semantic.emotional-manipulation",
          "text.payment-request",
          jobOnly,
        ]),
      ).toBe("job-bait");
    }
  });

  it("a prize phrase keeps prize ahead of investment", () => {
    expect(
      pick("high", [
        "text.prize-reward",
        "semantic.too-good-to-be-true",
        "semantic.isolation-secrecy",
      ]),
    ).toBe("prize");
  });

  it("one new semantic id alone gives generic (two-group gate at suspicious)", () => {
    for (const id of ["semantic.romance-money-story", "semantic.investment-scheme"]) {
      expect(pick("suspicious", [id]), id).toBe("generic");
    }
  });
});

describe("one new semantic id alone, fake AI", () => {
  const benign = MC_SAMPLES.filter((s) => s.expectedMonster === null);
  for (const id of ["semantic.romance-money-story", "semantic.investment-scheme"]) {
    it(`${id} on a benign message gives at most suspicious and generic`, async () => {
      for (const sample of benign) {
        const base = await rulesPipeline.run({ text: sample.text });
        if (base.level !== "no_signals") continue;
        const v = await createPipeline({ llmClient: fake([id], sample.text) }).run({
          text: sample.text,
        });
        const got = `${sample.id} level=${v.level} monster=${String(v.monster)}`;
        expect(["no_signals", "suspicious"], got).toContain(v.level);
        expect([null, "generic"], got).toContain(v.monster);
      }
    });
  }
});

describe("MC_SAMPLES synthetic checks", () => {
  it("has unique ids and both kinds", () => {
    const ids = MC_SAMPLES.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(MC_SAMPLES.filter((s) => s.expectedMonster === null).length).toBeGreaterThan(0);
    expect(MC_SAMPLES.filter((s) => s.expectedMonster !== null).length).toBeGreaterThan(0);
  });

  it("mentions no real brand, no URL and no digit run of 8 or more", () => {
    for (const s of MC_SAMPLES) {
      const text = s.text.toLowerCase();
      for (const brand of REAL_BRANDS) {
        const re = new RegExp(`(^|[^a-z0-9])${brand}([^a-z0-9]|$)`);
        expect(re.test(text), `${s.id} mentions ${brand}`).toBe(false);
      }
      expect(/\d{8,}/.test(s.text.replace(/[\s.-]/g, "")), s.id).toBe(false);
      expect(/https?:\/\/|www\./i.test(s.text), s.id).toBe(false);
    }
  });

  it("aiNew only adds ids from the closed semantic set", () => {
    const allowed = new Set([
      "semantic.impersonation-tone",
      "semantic.emotional-manipulation",
      "semantic.too-good-to-be-true",
      "semantic.isolation-secrecy",
      "semantic.relationship-or-job-bait",
      "semantic.pressure-escalation",
      "semantic.romance-money-story",
      "semantic.investment-scheme",
    ]);
    for (const s of MC_SAMPLES) {
      for (const id of [...s.aiOld, ...s.aiNew]) expect(allowed.has(id), `${s.id} ${id}`).toBe(true);
    }
  });
});
