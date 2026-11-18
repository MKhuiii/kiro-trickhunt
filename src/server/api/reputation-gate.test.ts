import { describe, expect, it } from "vitest";

import { createLlmBudget } from "./llm-budget";
import { createReputationGate, type ReputationBudget } from "./reputation-gate";

function countingBudget(allow: boolean) {
  const state = { calls: 0 };
  const budget: ReputationBudget = {
    tryAcquire() {
      state.calls += 1;
      return allow;
    },
  };
  return { budget, state };
}

describe("createReputationGate (REQ-LREP-14, 16, 17)", () => {
  it("reports skipped and does not touch the budget when never called", () => {
    const { budget, state } = countingBudget(true);
    const g = createReputationGate(budget);
    expect(g.outcome()).toBe("skipped");
    expect(state.calls).toBe(0);
  });

  it("acquires once and memoizes an allowed answer", () => {
    const { budget, state } = countingBudget(true);
    const g = createReputationGate(budget);
    expect(g.gate()).toBe(true);
    expect(g.gate()).toBe(true);
    expect(state.calls).toBe(1);
    expect(g.outcome()).toBe("used");
  });

  it("memoizes a denial and reports denied", () => {
    const { budget, state } = countingBudget(false);
    const g = createReputationGate(budget);
    expect(g.gate()).toBe(false);
    expect(g.gate()).toBe(false);
    expect(state.calls).toBe(1);
    expect(g.outcome()).toBe("denied");
  });

  it("treats a throwing budget as a denial, once", () => {
    let calls = 0;
    const g = createReputationGate({
      tryAcquire() {
        calls += 1;
        throw new Error("boom");
      },
    });
    expect(g.gate()).toBe(false);
    expect(g.gate()).toBe(false);
    expect(calls).toBe(1);
    expect(g.outcome()).toBe("denied");
  });

  it("works with createLlmBudget and counts a request only once", () => {
    const budget = createLlmBudget({
      callsPerMinute: 1,
      callsPerDay: 10,
      now: () => 1_000,
    });
    const first = createReputationGate(budget);
    first.gate();
    first.gate();
    expect(first.outcome()).toBe("used");
    const second = createReputationGate(budget);
    expect(second.gate()).toBe(false);
    expect(second.outcome()).toBe("denied");
  });
});
