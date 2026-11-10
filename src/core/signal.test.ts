/**
 * signal.test.ts — Unit tests for createSignal factory
 *
 * Covers:
 *   REQ-SIG-01: severity must be in [0, 1]
 *   REQ-SIG-02: id, evidence, whyItMatters must be non-empty
 *   REQ-SIG-03: returned Signal is immutable (frozen)
 */

import { describe, it, expect } from "vitest";
import { createSignal, type Signal } from "./signal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A fully valid Signal fixture. */
const validInput: Signal = {
  id: "url.suspicious-tld",
  source: "url",
  severity: 0.8,
  evidence: "Domain ends in .xyz — uncommon for legitimate organisations",
  whyItMatters: "Scammers often register cheap, obscure domains to avoid detection.",
};

// ---------------------------------------------------------------------------
// 1. Valid signal
// ---------------------------------------------------------------------------

describe("createSignal — valid input", () => {
  it("returns a signal with all fields intact", () => {
    const signal = createSignal(validInput);

    expect(signal.id).toBe(validInput.id);
    expect(signal.source).toBe(validInput.source);
    expect(signal.severity).toBe(validInput.severity);
    expect(signal.evidence).toBe(validInput.evidence);
    expect(signal.whyItMatters).toBe(validInput.whyItMatters);
  });

  it("returns a frozen (immutable) object (REQ-SIG-03)", () => {
    const signal = createSignal(validInput);
    expect(Object.isFrozen(signal)).toBe(true);
  });

  it("accepts severity = 0 (lower boundary)", () => {
    const signal = createSignal({ ...validInput, severity: 0 });
    expect(signal.severity).toBe(0);
  });

  it("accepts severity = 1 (upper boundary)", () => {
    const signal = createSignal({ ...validInput, severity: 1 });
    expect(signal.severity).toBe(1);
  });

  it("accepts all five SignalSource values", () => {
    const sources = ["url", "text", "image", "qr", "semantic"] as const;
    for (const source of sources) {
      const signal = createSignal({ ...validInput, source });
      expect(signal.source).toBe(source);
    }
  });
});

// ---------------------------------------------------------------------------
// 2. Severity out of range (REQ-SIG-01)
// ---------------------------------------------------------------------------

describe("createSignal — severity out of range (REQ-SIG-01)", () => {
  it("throws TypeError when severity is below 0", () => {
    expect(() => createSignal({ ...validInput, severity: -0.001 })).toThrow(TypeError);
  });

  it("throws TypeError when severity is above 1", () => {
    expect(() => createSignal({ ...validInput, severity: 1.001 })).toThrow(TypeError);
  });

  it("throws TypeError when severity is a large negative number", () => {
    expect(() => createSignal({ ...validInput, severity: -100 })).toThrow(TypeError);
  });

  it("throws TypeError when severity is greater than 100", () => {
    expect(() => createSignal({ ...validInput, severity: 100 })).toThrow(TypeError);
  });

  it("throws TypeError when severity is NaN", () => {
    expect(() => createSignal({ ...validInput, severity: NaN })).toThrow(TypeError);
  });

  it("throws TypeError when severity is Infinity", () => {
    expect(() => createSignal({ ...validInput, severity: Infinity })).toThrow(TypeError);
  });

  it("throws TypeError when severity is -Infinity", () => {
    expect(() => createSignal({ ...validInput, severity: -Infinity })).toThrow(TypeError);
  });

  it("error message mentions severity for out-of-range value", () => {
    expect(() => createSignal({ ...validInput, severity: 1.5 })).toThrow(
      /severity/i
    );
  });
});

// ---------------------------------------------------------------------------
// 3. Empty id (REQ-SIG-02)
// ---------------------------------------------------------------------------

describe("createSignal — empty id (REQ-SIG-02)", () => {
  it("throws TypeError when id is an empty string", () => {
    expect(() => createSignal({ ...validInput, id: "" })).toThrow(TypeError);
  });

  it("throws TypeError when id is only whitespace", () => {
    expect(() => createSignal({ ...validInput, id: "   " })).toThrow(TypeError);
  });

  it("error message mentions id", () => {
    expect(() => createSignal({ ...validInput, id: "" })).toThrow(/id/i);
  });
});

// ---------------------------------------------------------------------------
// 4. Empty evidence (REQ-SIG-02)
// ---------------------------------------------------------------------------

describe("createSignal — empty evidence (REQ-SIG-02)", () => {
  it("throws TypeError when evidence is an empty string", () => {
    expect(() => createSignal({ ...validInput, evidence: "" })).toThrow(TypeError);
  });

  it("throws TypeError when evidence is only whitespace", () => {
    expect(() => createSignal({ ...validInput, evidence: "\t\n " })).toThrow(TypeError);
  });

  it("error message mentions evidence", () => {
    expect(() => createSignal({ ...validInput, evidence: "" })).toThrow(/evidence/i);
  });
});

// ---------------------------------------------------------------------------
// 5. Empty whyItMatters (REQ-SIG-02)
// ---------------------------------------------------------------------------

describe("createSignal — empty whyItMatters (REQ-SIG-02)", () => {
  it("throws TypeError when whyItMatters is an empty string", () => {
    expect(() => createSignal({ ...validInput, whyItMatters: "" })).toThrow(TypeError);
  });

  it("throws TypeError when whyItMatters is only whitespace", () => {
    expect(() => createSignal({ ...validInput, whyItMatters: "  " })).toThrow(TypeError);
  });

  it("error message mentions whyItMatters", () => {
    expect(() =>
      createSignal({ ...validInput, whyItMatters: "" })
    ).toThrow(/whyItMatters/i);
  });
});
