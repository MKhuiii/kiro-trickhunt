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

function run(ids: string[]) {
  const signals = ids.map((i) => sig(i));
  return applyRules(aggregate(signals), signals);
}

describe("otp-with-context (REQ-PIPE-59)", () => {
  const otp = "text.otp-request";

  it("fires with each context signal", () => {
    for (const ctx of [
      "text.financial-institution",
      "text.urgency",
      "text.threat",
      "url.ip-host",
    ]) {
      const out = run([otp, ctx]);
      expect(out.level).toBe("critical");
      expect(out.score).toBeGreaterThanOrEqual(MIN_SCORE_BY_LEVEL.critical);
    }
  });

  it("does not fire with one side", () => {
    expect(run([otp]).level).toBe("suspicious");
    expect(run(["text.urgency"]).level).toBe("suspicious");
  });
});

describe("payment-with-pressure (REQ-PIPE-59)", () => {
  const pay = "text.payment-request";

  it("fires with each pressure signal", () => {
    for (const ctx of [
      "text.off-platform",
      "text.urgency",
      "text.threat",
      "text.authority-impersonation",
      "text.prize-reward",
    ]) {
      expect(run([pay, ctx]).level).toBe("critical");
    }
  });

  it("does not fire with one side", () => {
    expect(run([pay]).level).toBe("suspicious");
    expect(run(["text.urgency"]).level).toBe("suspicious");
  });
});

describe("authority-with-threat (REQ-PIPE-59)", () => {
  it("fires with both groups", () => {
    expect(run(["text.authority-impersonation", "text.threat"]).level).toBe("critical");
  });

  it("does not fire with one side", () => {
    expect(run(["text.authority-impersonation"]).level).toBe("suspicious");
    expect(run(["text.threat"]).level).toBe("suspicious");
  });
});

describe("job-offer-with-payment (REQ-PIPE-59)", () => {
  it("fires with both groups", () => {
    expect(run(["text.job-offer", "text.payment-request"]).level).toBe("critical");
  });

  it("does not fire with one side", () => {
    expect(run(["text.job-offer"]).level).toBe("suspicious");
    expect(run(["text.payment-request"]).level).toBe("suspicious");
  });
});

describe("job-offer-off-platform (REQ-PIPE-59)", () => {
  it("raises to high with both groups", () => {
    const out = run(["text.job-offer", "text.off-platform"]);
    expect(out.level).toBe("high");
    expect(out.score).toBeGreaterThanOrEqual(MIN_SCORE_BY_LEVEL.high);
  });

  it("does not fire with one side", () => {
    expect(run(["text.job-offer"]).level).toBe("suspicious");
    expect(run(["text.off-platform"]).level).toBe("suspicious");
  });
});
