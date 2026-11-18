import { describe, expect, it } from "vitest";

import { deriveReputationMode } from "./reputation-mode";

const ok = { status: "ok", checkedCount: 2 } as const;

const base = {
  checkLinks: true,
  configured: true,
  gate: "used",
  urlsAnalyzed: 2,
  reputation: ok,
} as const;

describe("deriveReputationMode", () => {
  it("returns not-requested when checkLinks is false, before anything else", () => {
    expect(
      deriveReputationMode({ ...base, checkLinks: false, configured: false, gate: "denied" }),
    ).toBe("not-requested");
  });

  it("returns not-configured before the budget result", () => {
    expect(deriveReputationMode({ ...base, configured: false, gate: "denied" })).toBe(
      "not-configured",
    );
  });

  it("returns budget-exhausted when the gate was denied", () => {
    expect(deriveReputationMode({ ...base, gate: "denied", urlsAnalyzed: 0 })).toBe(
      "budget-exhausted",
    );
  });

  it("returns skipped for zero URLs", () => {
    expect(deriveReputationMode({ ...base, gate: "skipped", urlsAnalyzed: 0 })).toBe("skipped");
  });

  it("returns skipped when status is ok and nothing was checked", () => {
    expect(
      deriveReputationMode({ ...base, reputation: { status: "ok", checkedCount: 0 } }),
    ).toBe("skipped");
  });

  it("returns failed for a degraded outcome", () => {
    expect(
      deriveReputationMode({
        ...base,
        reputation: { status: "degraded", reason: "timeout", checkedCount: 0 },
      }),
    ).toBe("failed");
  });

  it("returns checked otherwise", () => {
    expect(deriveReputationMode(base)).toBe("checked");
  });
});
