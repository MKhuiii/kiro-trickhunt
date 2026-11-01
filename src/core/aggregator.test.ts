/**
 * aggregator.test.ts — Unit tests for aggregate()
 *
 * Covers REQ-AGG-01 through REQ-AGG-06.
 */

import { describe, it, expect } from "vitest";
import { aggregate } from "./aggregator";
import { createSignal, type Signal } from "./signal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSignal(severity: number, id = "test.signal"): Signal {
  return createSignal({
    id,
    source: "text",
    severity,
    evidence: "test evidence",
    whyItMatters: "test explanation",
  });
}

// ---------------------------------------------------------------------------
// REQ-AGG-01 — empty list
// ---------------------------------------------------------------------------

describe("aggregate — empty list (REQ-AGG-01)", () => {
  it("returns score 0 with level no_signals and empty signals array", () => {
    const result = aggregate([]);
    expect(result.score).toBe(0);
    expect(result.level).toBe("no_signals");
    expect(result.signals).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// REQ-AGG-04 — single signal with severity = 1
// ---------------------------------------------------------------------------

describe("aggregate — single signal severity=1 (REQ-AGG-04)", () => {
  it("returns score 100 and level critical", () => {
    const result = aggregate([makeSignal(1)]);
    expect(result.score).toBe(100);
    expect(result.level).toBe("critical");
  });
});

// ---------------------------------------------------------------------------
// Level boundary values (§2.3)
// ---------------------------------------------------------------------------

describe("aggregate — level boundary values", () => {
  // score = 0 with a non-empty list → "suspicious" (not no_signals)
  it("returns suspicious for score 0 with a non-empty signal list", () => {
    // severity = 0 → score = round((1 - 1) * 100) = 0, but signals non-empty
    const result = aggregate([makeSignal(0)]);
    expect(result.score).toBe(0);
    expect(result.level).toBe("suspicious");
  });

  // score = 49 → "suspicious"
  it("returns suspicious at score 49", () => {
    // Use two signals: noisy-or of two severities that produces ~49
    // We can test with a direct check: construct a signal whose score lands at 49.
    // severity = 0.49 → score = round(0.49 * 100) = 49
    const result = aggregate([makeSignal(0.49)]);
    expect(result.score).toBe(49);
    expect(result.level).toBe("suspicious");
  });

  // score = 50 → "high"
  it("returns high at score 50", () => {
    // severity = 0.5 → score = round(0.5 * 100) = 50
    const result = aggregate([makeSignal(0.5)]);
    expect(result.score).toBe(50);
    expect(result.level).toBe("high");
  });

  // score = 79 → "high"
  it("returns high at score 79", () => {
    // severity = 0.79 → score = round(0.79 * 100) = 79
    const result = aggregate([makeSignal(0.79)]);
    expect(result.score).toBe(79);
    expect(result.level).toBe("high");
  });

  // score = 80 → "critical"
  it("returns critical at score 80", () => {
    // severity = 0.8 → score = round(0.8 * 100) = 80
    const result = aggregate([makeSignal(0.8)]);
    expect(result.score).toBe(80);
    expect(result.level).toBe("critical");
  });
});

// ---------------------------------------------------------------------------
// REQ-AGG-02 — score is always an integer
// ---------------------------------------------------------------------------

describe("aggregate — score is always an integer (REQ-AGG-02)", () => {
  it("score is an integer for a single signal", () => {
    const result = aggregate([makeSignal(0.333)]);
    expect(Number.isInteger(result.score)).toBe(true);
  });

  it("score is an integer for multiple signals", () => {
    const signals = [makeSignal(0.3, "a"), makeSignal(0.4, "b"), makeSignal(0.25, "c")];
    const result = aggregate(signals);
    expect(Number.isInteger(result.score)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// REQ-AGG-05 — original signal list is returned unchanged
// ---------------------------------------------------------------------------

describe("aggregate — signals list is unchanged (REQ-AGG-05)", () => {
  it("returns the same signal references", () => {
    const s1 = makeSignal(0.4, "sig.a");
    const s2 = makeSignal(0.6, "sig.b");
    const input = [s1, s2] as const;
    const result = aggregate(input);
    expect(result.signals).toBe(input);
  });

  it("returned signals array has same length as input", () => {
    const signals = [makeSignal(0.2, "a"), makeSignal(0.3, "b")];
    const result = aggregate(signals);
    expect(result.signals).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// REQ-AGG-06 — deterministic / pure function
// ---------------------------------------------------------------------------

describe("aggregate — deterministic for identical inputs (REQ-AGG-06)", () => {
  it("returns the same score on repeated calls with the same signals", () => {
    const signals = [makeSignal(0.3, "a"), makeSignal(0.5, "b")];
    const r1 = aggregate(signals);
    const r2 = aggregate(signals);
    expect(r1.score).toBe(r2.score);
    expect(r1.level).toBe(r2.level);
  });
});

// ---------------------------------------------------------------------------
// Multi-signal noisy-or formula correctness
// ---------------------------------------------------------------------------

describe("aggregate — noisy-or formula correctness", () => {
  it("combines two signals using noisy-or correctly", () => {
    // 0.5 and 0.5: p_survive = 0.5 * 0.5 = 0.25, score = round(0.75 * 100) = 75
    const result = aggregate([makeSignal(0.5, "a"), makeSignal(0.5, "b")]);
    expect(result.score).toBe(75);
    expect(result.level).toBe("high");
  });

  it("score is higher than any individual signal's contribution", () => {
    const r1 = aggregate([makeSignal(0.4)]);
    const r2 = aggregate([makeSignal(0.4, "a"), makeSignal(0.4, "b")]);
    expect(r2.score).toBeGreaterThan(r1.score);
  });
});
