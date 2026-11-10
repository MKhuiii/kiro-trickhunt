import { describe, expect, it } from "vitest";

import { aggregate, createSignal } from "../core";
import type { Signal } from "../core";

import { applyRules } from "./combine";
import { MIN_SCORE_BY_LEVEL } from "./rules.config";

function sig(id: string, severity = 0.1): Signal {
  return createSignal({
    id,
    source: id.startsWith("url.") ? "url" : id.startsWith("semantic.") ? "semantic" : "text",
    severity,
    evidence: "ev",
    whyItMatters: "because",
  });
}

function run(signals: Signal[]) {
  return applyRules(aggregate(signals), signals);
}

describe("MIN_SCORE_BY_LEVEL", () => {
  it("matches the aggregator thresholds", () => {
    expect(aggregate([sig("text.a", MIN_SCORE_BY_LEVEL.suspicious / 100)]).level).toBe("suspicious");
    expect(aggregate([sig("text.a", MIN_SCORE_BY_LEVEL.high / 100)]).level).toBe("high");
    expect(aggregate([sig("text.a", MIN_SCORE_BY_LEVEL.critical / 100)]).level).toBe("critical");
    expect(aggregate([sig("text.a", (MIN_SCORE_BY_LEVEL.high - 1) / 100)]).level).toBe("suspicious");
    expect(aggregate([sig("text.a", (MIN_SCORE_BY_LEVEL.critical - 1) / 100)]).level).toBe("high");
  });
});

describe("applyRules", () => {
  it("does not fire on empty signals", () => {
    expect(applyRules({ score: 0, level: "no_signals" }, [])).toEqual({
      score: 0,
      level: "no_signals",
    });
  });

  it("does not fire when nothing matches", () => {
    const signals = [sig("text.urgency", 0.2)];
    const agg = aggregate(signals);
    expect(applyRules(agg, signals)).toEqual({ score: agg.score, level: agg.level });
  });

  describe("sensitive-data-with-link", () => {
    it("fires and raises to high with sensitive data plus a url.* signal", () => {
      const out = run([sig("text.sensitive-data-request", 0.1), sig("url.ip-host", 0.1)]);
      expect(out.level).toBe("high");
      expect(out.score).toBe(MIN_SCORE_BY_LEVEL.high);
    });

    it("matches any url. prefix", () => {
      for (const id of ["url.a", "url.brand-lookalike", "url.some.nested"]) {
        expect(run([sig("text.sensitive-data-request"), sig(id)]).level).toBe("high");
      }
    });

    it("does not match ids merely containing or resembling the prefix", () => {
      for (const id of ["url", "urlx.thing", "text.url.thing", "semantic.url.x"]) {
        expect(run([sig("text.sensitive-data-request"), sig(id)]).level).toBe("suspicious");
      }
    });

    it("does not fire with only one side", () => {
      expect(run([sig("text.sensitive-data-request")]).level).toBe("suspicious");
      expect(run([sig("url.ip-host")]).level).toBe("suspicious");
    });
  });

  describe("otp-urgent-impersonation", () => {
    const otp = "text.otp-request";

    it("fires with all three groups", () => {
      const out = run([sig(otp), sig("text.urgency"), sig("text.authority-impersonation")]);
      expect(out.level).toBe("critical");
      expect(out.score).toBe(MIN_SCORE_BY_LEVEL.critical);
    });

    it("accepts alternatives within each group", () => {
      expect(run([sig(otp), sig("text.threat"), sig("url.credential-keywords")]).level).toBe("critical");
      expect(run([sig(otp), sig("text.urgency"), sig("url.brand-lookalike")]).level).toBe("critical");
    });

    it("needs all three groups", () => {
      const a = sig("text.urgency");
      const b = sig("text.authority-impersonation");
      expect(run([otp, "text.urgency"].map((i) => sig(i))).level).toBe("suspicious");
      expect(run([sig(otp), b]).level).toBe("suspicious");
      expect(run([a, b]).level).toBe("suspicious");
    });
  });

  describe("never lowers", () => {
    it("keeps a higher aggregate score and level", () => {
      const signals = [
        sig("text.sensitive-data-request", 0.9),
        sig("url.ip-host", 0.9),
        sig("text.x", 0.9),
      ];
      const agg = aggregate(signals);
      expect(agg.level).toBe("critical");
      const out = applyRules(agg, signals);
      expect(out.score).toBe(agg.score);
      expect(out.level).toBe("critical");
    });

    it("score is the max of aggregate and the minimum for the fired level", () => {
      const signals = [sig("text.sensitive-data-request", 0.6), sig("url.ip-host", 0.3)];
      const agg = aggregate(signals);
      expect(agg.score).toBeGreaterThan(MIN_SCORE_BY_LEVEL.high);
      expect(agg.level).toBe("high");
      expect(applyRules(agg, signals)).toEqual({ score: agg.score, level: "high" });
    });

    it("does not lower a critical level when only a high rule fires", () => {
      const out = applyRules({ score: 90, level: "critical" }, [
        sig("text.sensitive-data-request"),
        sig("url.ip-host"),
      ]);
      expect(out).toEqual({ score: 90, level: "critical" });
    });

    it("the highest fired rule wins when both fire", () => {
      const out = run([
        sig("text.otp-request"),
        sig("text.urgency"),
        sig("url.brand-lookalike"),
        sig("text.sensitive-data-request"),
      ]);
      expect(out.level).toBe("critical");
      expect(out.score).toBeGreaterThanOrEqual(MIN_SCORE_BY_LEVEL.critical);
    });
  });
});
