/**
 * semantic-analyzer.property.test.ts — Property-based tests for the Semantic Analyzer
 *
 * **Validates: Requirements PBT-18, PBT-19**
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  redactSensitive,
  buildPrompt,
  parseLlmResponse,
  SEMANTIC_OPEN_DELIMITER,
  SEMANTIC_CLOSE_DELIMITER,
} from "./semantic-analyzer";
import { MAX_SIGNALS, SEMANTIC_SIGNALS } from "./semantic-analyzer.config";

/** Arbitrary text: plain strings and full-unicode (binary) strings. */
const anyText = fc.oneof(fc.string(), fc.string({ unit: "binary" }));

const digits = (min: number, max: number) =>
  fc.stringMatching(new RegExp(`^[0-9]{${min},${max}}$`));

const digitRun = digits(1, 24);
const longDigitRun = digits(6, 24);
const phoneIntl = digits(8, 12).map((d) => `+84${d}`);
const phoneSpaced = fc
  .tuple(digits(3, 3), digits(3, 3), digits(3, 3))
  .map(([a, b, c]) => `+84 ${a} ${b} ${c}`);
const phoneLocal = digits(9, 9).map((d) => `09${d.slice(0, 8)}`);
const email = fc
  .tuple(fc.stringMatching(/^[a-z0-9._]{1,12}$/), fc.stringMatching(/^[a-z0-9]{1,10}$/), fc.constantFrom("com", "vn", "co.uk"))
  .map(([l, d, tld]) => `${l}@${d}.${tld}`);
const sepNumber = fc
  .tuple(digits(4, 4), digits(4, 4), digits(4, 4), digits(4, 4), fc.constantFrom(" ", "-"))
  .map(([a, b, c, d, sep]) => [a, b, c, d].join(sep));

const fragment = fc.oneof(
  anyText,
  digitRun,
  longDigitRun,
  phoneIntl,
  phoneSpaced,
  phoneLocal,
  email,
  sepNumber,
);

/** Arbitrary text mixed with sensitive-looking fragments. */
const mixedText = fc
  .array(fc.tuple(fragment, fc.constantFrom("", " ", "-", ".", ", ", "\n")), { maxLength: 8 })
  .map((parts) => parts.map(([f, sep]) => f + sep).join(""));

describe("PBT-18 — redacted output has no long ASCII digit runs", () => {
  it("contains no digit run of length >= 4", () => {
    fc.assert(
      fc.property(mixedText, (s) => !/[0-9]{4,}/.test(redactSensitive(s))),
      { numRuns: 500 },
    );
  });

  it("removes every digit run of length >= 6 present in the input", () => {
    fc.assert(
      fc.property(mixedText, (s) => {
        const out = redactSensitive(s);
        const runs = s.match(/[0-9]{6,}/g) ?? [];
        return runs.every((run) => !out.includes(run));
      }),
      { numRuns: 500 },
    );
  });

  it("masks a lone long digit run", () => {
    fc.assert(
      fc.property(longDigitRun, (d) => !/[0-9]{4,}/.test(redactSensitive(d))),
      { numRuns: 200 },
    );
  });
});

describe("PBT-19 — redactSensitive is idempotent and never throws", () => {
  it("is idempotent for arbitrary and mixed strings", () => {
    fc.assert(
      fc.property(fc.oneof(anyText, mixedText), (s) => {
        const once = redactSensitive(s);
        expect(redactSensitive(once)).toBe(once);
      }),
      { numRuns: 500 },
    );
  });

  it("never throws and returns a string", () => {
    fc.assert(
      fc.property(fc.oneof(anyText, mixedText), (s) => {
        expect(typeof redactSensitive(s)).toBe("string");
      }),
      { numRuns: 500 },
    );
  });
});

/**
 * PBT-20 — delimiters appear exactly once in the user prompt.
 *
 * **Validates: Requirements 3.1 (REQ-SEM-13, REQ-SEM-14, REQ-SEM-15), PBT-20**
 */
const countOcc = (haystack: string, needle: string): number =>
  haystack.split(needle).length - 1;

const angleRun = fc
  .tuple(fc.constantFrom("<", ">"), fc.integer({ min: 1, max: 12 }))
  .map(([ch, n]) => ch.repeat(n));

const delimiterPiece = fc.oneof(
  fc.string(),
  fc.string({ unit: "binary" }),
  fc.constantFrom(
    SEMANTIC_OPEN_DELIMITER,
    SEMANTIC_CLOSE_DELIMITER,
    "TRICKHUNT_TEXT",
    "END_TRICKHUNT_TEXT",
  ),
  angleRun,
);

const delimiterMixed = fc
  .array(delimiterPiece, { maxLength: 10 })
  .map((parts) => parts.join(""));

describe("PBT-20 — buildPrompt delimiters appear exactly once", () => {
  it("open and close delimiters each appear exactly once in user", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.string({ unit: "binary" }), delimiterMixed),
        (s) => {
          const { user } = buildPrompt(s);
          expect(countOcc(user, SEMANTIC_CLOSE_DELIMITER)).toBe(1);
          expect(countOcc(user, SEMANTIC_OPEN_DELIMITER)).toBe(1);
          expect(user.startsWith(SEMANTIC_OPEN_DELIMITER)).toBe(true);
          expect(user.endsWith(SEMANTIC_CLOSE_DELIMITER)).toBe(true);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

/**
 * PBT-21 — parseLlmResponse never throws, caps signals, unique ids.
 *
 * **Validates: Requirements 4.1 (REQ-SEM-16 to REQ-SEM-22), PBT-21**
 */
const validIds: readonly string[] = SEMANTIC_SIGNALS.map((s) => s.id);

const idArb = fc.oneof(
  fc.constantFrom(...validIds),
  fc.constantFrom(...validIds),
  fc.string(),
);

const severityArb = fc.oneof(
  fc.double({ min: -2, max: 3, noNaN: true }),
  fc.constantFrom(0, 1, 0.5, -1, 100, Number.MAX_VALUE),
  fc.string(),
  fc.constant(null),
);

/** Builds a JSON-ish response from a sent text, with evidence from/outside it. */
const parseCase = fc
  .tuple(
    fc.oneof(fc.string(), fc.string({ unit: "binary" })),
    fc.array(
      fc.record({
        id: idArb,
        severity: severityArb,
        pick: fc.boolean(),
        start: fc.nat(40),
        len: fc.integer({ min: 0, max: 40 }),
        other: fc.oneof(fc.string(), fc.string({ unit: "binary" })),
      }),
      { maxLength: 20 },
    ),
    fc.constantFrom("none", "fence", "fence-json"),
    fc.boolean(),
  )
  .map(([sent, entries, wrap, extra]) => {
    const signals = entries.map((e) => ({
      id: e.id,
      severity: e.severity,
      evidence: e.pick ? sent.slice(e.start, e.start + e.len) : e.other,
      ...(extra ? { verdict: "scam", score: 1 } : {}),
    }));
    const json = JSON.stringify({ signals });
    const raw =
      wrap === "none"
        ? json
        : wrap === "fence"
          ? "```\n" + json + "\n```"
          : "```json\n" + json + "\n```";
    return { sent, raw };
  });

describe("PBT-21 — parseLlmResponse is total, capped and de-duplicated", () => {
  const check = (raw: string, sent: string) => {
    const out = parseLlmResponse(raw, sent);
    expect(out.length).toBeLessThanOrEqual(MAX_SIGNALS);
    const ids = out.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of out) {
      expect(s.source).toBe("semantic");
      expect(validIds).toContain(s.id);
    }
  };

  it("holds for arbitrary raw strings and sent texts", () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.string(), fc.string({ unit: "binary" })),
        fc.oneof(fc.string(), fc.string({ unit: "binary" })),
        (raw, sent) => {
          check(raw, sent);
        },
      ),
      { numRuns: 500 },
    );
  });

  it("holds for JSON-ish responses with valid and random entries", () => {
    fc.assert(
      fc.property(parseCase, ({ raw, sent }) => {
        check(raw, sent);
      }),
      { numRuns: 1000 },
    );
  });
});

/**
 * PBT-16, PBT-17, PBT-22 — analyzeSemantic with FakeLlmClient.
 *
 * **Validates: Requirements 5.1 (REQ-SEM-23 to REQ-SEM-27), PBT-16, PBT-17, PBT-22**
 */
import { analyzeSemantic } from "./semantic-analyzer";
import { FakeLlmClient } from "./fake-llm-client";
import { SEVERITY_CAP, MAX_INPUT_CHARS } from "./semantic-analyzer.config";
import { createSignal } from "../core/signal";

const textArb = fc.oneof(fc.string(), fc.string({ unit: "binary" }));

const clientArb: fc.Arbitrary<FakeLlmClient> = fc.oneof(
  fc.string().map((t) => FakeLlmClient.responding(t)),
  fc.string({ unit: "binary" }).map((t) => FakeLlmClient.responding(t)),
  fc.json().map((t) => FakeLlmClient.responding(t)),
  fc.anything().map((v) => FakeLlmClient.responding(JSON.stringify(v) ?? "")),
  fc
    .array(fc.record({ id: fc.string(), severity: fc.anything(), evidence: fc.anything() }), { maxLength: 5 })
    .map((signals) => FakeLlmClient.responding(JSON.stringify({ signals }))),
  fc.constant(FakeLlmClient.throwing()),
  fc.constant(FakeLlmClient.rejecting()),
  fc.constant(FakeLlmClient.neverResolving()),
);

describe("PBT-16 — analyzeSemantic always resolves", () => {
  it("resolves with a valid result for any text and client behavior", async () => {
    await fc.assert(
      fc.asyncProperty(textArb, clientArb, async (s, client) => {
        const r = await analyzeSemantic(s, client, { timeoutMs: 5 });
        expect(["ok", "degraded"]).toContain(r.status);
        expect(Array.isArray(r.signals)).toBe(true);
        if (r.status === "degraded") {
          expect(r.signals).toEqual([]);
          expect(["timeout", "client-error", "invalid-response", "skipped"]).toContain(r.reason);
        } else {
          expect(r.reason).toBeUndefined();
          expect(r.signals.length).toBeLessThanOrEqual(MAX_SIGNALS);
        }
      }),
      { numRuns: 150 },
    );
  });
});

describe("PBT-17 — returned signals are valid, capped and grounded", () => {
  const entryArb = fc.record({
    id: idArb,
    severity: fc.oneof(
      fc.double({ min: -2, max: 3, noNaN: true }),
      fc.constantFrom(0, 1, 5, -1, 1e308),
    ),
    pick: fc.boolean(),
    start: fc.nat(60),
    len: fc.integer({ min: 1, max: 40 }),
    other: textArb,
  });

  it("every signal passes createSignal, is semantic, in-set, capped, and evidence is in sent text", async () => {
    await fc.assert(
      fc.asyncProperty(textArb, fc.array(entryArb, { maxLength: 10 }), async (s, entries) => {
        const sent = redactSensitive(s.slice(0, MAX_INPUT_CHARS));
        const signals = entries.map((e) => ({
          id: e.id,
          severity: e.severity,
          evidence: e.pick ? sent.slice(e.start, e.start + e.len) : e.other,
        }));
        const client = FakeLlmClient.responding(JSON.stringify({ signals }));
        const r = await analyzeSemantic(s, client, { timeoutMs: 1000 });
        for (const sig of r.signals) {
          expect(() => createSignal(sig)).not.toThrow();
          expect(sig.source).toBe("semantic");
          expect(validIds).toContain(sig.id);
          expect(sig.severity).toBeLessThanOrEqual(SEVERITY_CAP);
          expect(sent.includes(sig.evidence)).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe("PBT-22 — blank input skips the client", () => {
  const blank = fc
    .array(fc.constantFrom(" ", "\t", "\n", "\r"))
    .map((a) => a.join(""));

  it("never calls the client and returns degraded/skipped", async () => {
    await fc.assert(
      fc.asyncProperty(blank, async (s) => {
        const client = FakeLlmClient.responding('{"signals":[]}');
        const r = await analyzeSemantic(s, client, { timeoutMs: 5 });
        expect(client.callCount).toBe(0);
        expect(r).toEqual({ signals: [], status: "degraded", reason: "skipped" });
      }),
      { numRuns: 100 },
    );
  });
});
