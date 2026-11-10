import { describe, expect, it } from "vitest";

import { aggregate, createSignal } from "../core";
import type { Signal } from "../core";

import { MAX_EVIDENCE_CHARS } from "./pipeline.config";
import { reduceForScoring, shortenEvidence, sortBySeverity } from "./reduce";

function sig(id: string, severity: number, evidence = "ev"): Signal {
  return createSignal({
    id,
    source: id.startsWith("url.") ? "url" : id.startsWith("semantic.") ? "semantic" : "text",
    severity,
    evidence,
    whyItMatters: "because",
  });
}

describe("shortenEvidence", () => {
  it("returns the same objects when evidence is within the limit", () => {
    const s = sig("text.urgency", 0.5, "a".repeat(MAX_EVIDENCE_CHARS));
    const out = shortenEvidence([s]);
    expect(out[0]).toBe(s);
  });

  it("creates a new signal, does not mutate, and respects the limit", () => {
    const long = "x".repeat(MAX_EVIDENCE_CHARS * 3);
    const s = sig("text.urgency", 0.5, long);
    const [out] = shortenEvidence([s]);
    expect(out).not.toBe(s);
    expect(out.evidence.length).toBeLessThanOrEqual(MAX_EVIDENCE_CHARS);
    expect(s.evidence).toBe(long);
    expect(out.id).toBe(s.id);
    expect(out.severity).toBe(s.severity);
    expect(Object.isFrozen(out)).toBe(true);
  });

  it("preserves order", () => {
    const a = sig("text.a", 0.1, "y".repeat(500));
    const b = sig("text.b", 0.2);
    expect(shortenEvidence([a, b]).map((s) => s.id)).toEqual(["text.a", "text.b"]);
  });
});

describe("reduceForScoring", () => {
  it("overlap pair does not inflate the score", () => {
    const a = sig("text.authority-impersonation", 0.6);
    const b = sig("semantic.impersonation-tone", 0.5);
    const reduced = reduceForScoring([a, b]);
    expect(reduced).toEqual([a]);
    expect(aggregate(reduced).score).toBe(aggregate([a]).score);
    expect(aggregate(reduced).score).toBeLessThan(aggregate([a, b]).score);
  });

  it("keeps the stronger of an overlap pair regardless of order", () => {
    const a = sig("text.urgency", 0.3);
    const b = sig("semantic.pressure-escalation", 0.7);
    expect(reduceForScoring([a, b])).toEqual([b]);
    expect(reduceForScoring([b, a])).toEqual([b]);
  });

  it("ties in an overlap group keep the earliest", () => {
    const a = sig("text.prize-reward", 0.5, "first");
    const b = sig("semantic.too-good-to-be-true", 0.5, "second");
    expect(reduceForScoring([a, b])[0]).toBe(a);
    expect(reduceForScoring([b, a])[0]).toBe(b);
  });

  it("repeated URL signals collapse to the strongest per id", () => {
    const weak = sig("url.ip-host", 0.2, "one");
    const strong = sig("url.ip-host", 0.6, "two");
    const other = sig("url.ip-host", 0.4, "three");
    const out = reduceForScoring([weak, strong, other]);
    expect(out).toEqual([strong]);
  });

  it("ties for the same ungrouped id keep the earliest", () => {
    const a = sig("url.ip-host", 0.4, "first");
    const b = sig("url.ip-host", 0.4, "second");
    expect(reduceForScoring([a, b])[0]).toBe(a);
  });

  it("keeps distinct ids and ungrouped signals", () => {
    const a = sig("text.otp-request", 0.5);
    const b = sig("url.ip-host", 0.4);
    const out = reduceForScoring([a, b]);
    expect(out).toHaveLength(2);
    expect(out).toContain(a);
    expect(out).toContain(b);
  });

  it("does not mutate the input and handles empty input", () => {
    expect(reduceForScoring([])).toEqual([]);
    const input = [sig("text.urgency", 0.3), sig("semantic.pressure-escalation", 0.7)];
    const copy = [...input];
    reduceForScoring(input);
    expect(input).toEqual(copy);
  });
});

describe("sortBySeverity", () => {
  it("sorts by severity descending", () => {
    const out = sortBySeverity([sig("text.a", 0.1), sig("text.b", 0.9), sig("text.c", 0.5)]);
    expect(out.map((s) => s.id)).toEqual(["text.b", "text.c", "text.a"]);
  });

  it("is stable on ties", () => {
    const input = [
      sig("text.a", 0.5),
      sig("text.b", 0.5),
      sig("text.c", 0.9),
      sig("text.d", 0.5),
    ];
    expect(sortBySeverity(input).map((s) => s.id)).toEqual([
      "text.c",
      "text.a",
      "text.b",
      "text.d",
    ]);
  });

  it("returns a new array and does not mutate the input", () => {
    const input = [sig("text.a", 0.1), sig("text.b", 0.9)];
    const out = sortBySeverity(input);
    expect(out).not.toBe(input);
    expect(input.map((s) => s.id)).toEqual(["text.a", "text.b"]);
  });
});
