import { describe, expect, it } from "vitest";

import { LLM_DAY_WINDOW_MS, LLM_MINUTE_WINDOW_MS } from "./api-limits.config";
import { createLlmBudget } from "./llm-budget";

function setup(callsPerMinute: number, callsPerDay: number) {
  let time = 1_000_000;
  const budget = createLlmBudget({
    callsPerMinute,
    callsPerDay,
    now: () => time,
  });
  return {
    budget,
    advance: (ms: number) => {
      time += ms;
    },
  };
}

describe("createLlmBudget (REQ-API-27)", () => {
  it("allows up to the minute cap then denies", () => {
    const { budget } = setup(3, 100);
    expect(budget.tryAcquire()).toBe(true);
    expect(budget.tryAcquire()).toBe(true);
    expect(budget.tryAcquire()).toBe(true);
    expect(budget.tryAcquire()).toBe(false);
    expect(budget.tryAcquire()).toBe(false);
  });

  it("recovers after the minute window", () => {
    const { budget, advance } = setup(2, 100);
    expect(budget.tryAcquire()).toBe(true);
    expect(budget.tryAcquire()).toBe(true);
    expect(budget.tryAcquire()).toBe(false);
    advance(LLM_MINUTE_WINDOW_MS - 1);
    expect(budget.tryAcquire()).toBe(false);
    advance(1);
    expect(budget.tryAcquire()).toBe(true);
  });

  it("denies once the day cap is reached even when the minute window is clear", () => {
    const { budget, advance } = setup(10, 3);
    for (let i = 0; i < 3; i += 1) {
      expect(budget.tryAcquire()).toBe(true);
      advance(LLM_MINUTE_WINDOW_MS);
    }
    expect(budget.tryAcquire()).toBe(false);
  });

  it("recovers after the day window", () => {
    const { budget, advance } = setup(10, 2);
    expect(budget.tryAcquire()).toBe(true);
    expect(budget.tryAcquire()).toBe(true);
    expect(budget.tryAcquire()).toBe(false);
    advance(LLM_DAY_WINDOW_MS - 1);
    expect(budget.tryAcquire()).toBe(false);
    advance(1);
    expect(budget.tryAcquire()).toBe(true);
    expect(budget.tryAcquire()).toBe(true);
    expect(budget.tryAcquire()).toBe(false);
  });

  it("does not record denied attempts", () => {
    const { budget, advance } = setup(1, 100);
    expect(budget.tryAcquire()).toBe(true);
    advance(30_000);
    expect(budget.tryAcquire()).toBe(false);
    advance(30_000);
    // First acquisition is now 60s old; the denied one must not extend the window.
    expect(budget.tryAcquire()).toBe(true);
  });

  it("always denies when the minute limit is zero", () => {
    const { budget, advance } = setup(0, 100);
    expect(budget.tryAcquire()).toBe(false);
    advance(LLM_DAY_WINDOW_MS * 2);
    expect(budget.tryAcquire()).toBe(false);
  });

  it("always denies when the day limit is zero", () => {
    const { budget, advance } = setup(10, 0);
    expect(budget.tryAcquire()).toBe(false);
    advance(LLM_DAY_WINDOW_MS * 2);
    expect(budget.tryAcquire()).toBe(false);
  });
});
