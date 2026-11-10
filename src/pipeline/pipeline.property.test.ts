/**
 * pipeline.property.test.ts — Property-based tests for createPipeline
 *
 * **Validates: Requirements PBT-28, PBT-29, PBT-30, PBT-32, PBT-34, PBT-35,
 * PBT-36, PBT-37** (REQ-PIPE-02 to 05, 18, 20, 21, 27)
 *
 * All tests use FakeLlmClient (never the network). Never-resolving clients
 * use a few-millisecond pipeline timeout.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

import { FakeLlmClient } from "../analyzers/fake-llm-client";
import type { FakeLlmBehavior } from "../analyzers/fake-llm-client";
import { TEXT_PATTERNS } from "../analyzers/text-analyzer.config";
import { SEMANTIC_SIGNALS } from "../analyzers/semantic-analyzer.config";

import { createPipeline } from "./pipeline";
import { MAX_EVIDENCE_CHARS, MAX_TEXT_CHARS } from "./pipeline.config";
import type { Verdict } from "./verdict";

const LEVELS = ["no_signals", "suspicious", "high", "critical"];
const MONSTERS = ["bank", "prize", "job-bait", "authority", "generic"];
const TIMEOUT_MS = 5;
const RUNS = 40;

type RunInput = { text?: string; urls?: string[] };

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

const phrases: string[] = TEXT_PATTERNS.flatMap((p) => [...p.phrases.en, ...p.phrases.vi]);
const phrase = fc.constantFrom(...phrases);

/** Arbitrary text-ish values, including non-strings, cast as input. */
const arbitraryInput: fc.Arbitrary<RunInput> = fc.oneof(
  fc.record({ text: fc.string({ maxLength: 300 }), urls: fc.array(fc.string({ maxLength: 60 }), { maxLength: 4 }) }),
  fc.record({ text: fc.string({ unit: "binary", maxLength: 300 }), urls: fc.array(fc.webUrl(), { maxLength: 7 }) }),
  fc.record({ text: fc.anything(), urls: fc.anything() }),
  fc.anything(),
) as fc.Arbitrary<RunInput>;

/** Text made from trigger phrases plus URLs. */
const phraseText: fc.Arbitrary<RunInput> = fc
  .tuple(
    fc.array(fc.oneof(phrase, fc.constantFrom("hello", "please", "now")), { minLength: 1, maxLength: 6 }),
    fc.array(fc.webUrl(), { maxLength: 3 }),
  )
  .map(([words, urls]) => ({ text: [...words, ...urls].join(" ") }));

const validJson = JSON.stringify({
  signals: [{ id: SEMANTIC_SIGNALS[0].id, severity: 0.5, evidence: "x" }],
});

const behavior: fc.Arbitrary<FakeLlmBehavior | null> = fc.oneof(
  fc.constant(null),
  fc.string({ maxLength: 200 }).map((text) => ({ kind: "respond", text }) as const),
  fc.anything().map((v) => ({ kind: "respond", text: JSON.stringify(v) ?? "" }) as const),
  fc.constant({ kind: "respond", text: validJson } as const),
  fc.constant({ kind: "throw" } as const),
  fc.constant({ kind: "reject" } as const),
  fc.constant({ kind: "never" } as const),
);

/** Always-failing behaviours (PBT-34). */
const failing: fc.Arbitrary<FakeLlmBehavior> = fc.constantFrom<FakeLlmBehavior>(
  { kind: "throw" },
  { kind: "reject" },
  { kind: "respond", text: "}{ not json" },
  { kind: "never" },
);

function pipelineFor(b: FakeLlmBehavior | null) {
  return createPipeline({
    llmClient: b === null ? null : new FakeLlmClient(b),
    semanticTimeoutMs: TIMEOUT_MS,
  });
}

function isValid(v: Verdict): boolean {
  return (
    Number.isInteger(v.riskScore) &&
    v.riskScore >= 0 &&
    v.riskScore <= 100 &&
    LEVELS.includes(v.level) &&
    (v.monster === null || MONSTERS.includes(v.monster)) &&
    v.actions.length > 0 &&
    v.limitations.length > 0
  );
}

const opts = { numRuns: RUNS };

// ---------------------------------------------------------------------------

describe("PBT-28 — run never rejects or throws", () => {
  it("resolves for arbitrary input and any client behaviour", async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryInput, behavior, async (input, b) => {
        let p: Promise<Verdict>;
        try {
          p = pipelineFor(b).run(input);
        } catch {
          return false;
        }
        const v = await p.then(
          (x) => x,
          () => null,
        );
        return v !== null;
      }),
      opts,
    );
  });
});

describe("PBT-29 — verdict shape is always valid", () => {
  it("score, level, monster, actions and limitations are well formed", async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryInput, behavior, async (input, b) => {
        const v = await pipelineFor(b).run(input);
        return isValid(v);
      }),
      opts,
    );
  });
});

describe("PBT-30 — monotonicity with no semantic signals", () => {
  it("appending a trigger phrase never lowers riskScore", async () => {
    const noSignals: FakeLlmBehavior = { kind: "respond", text: '{"signals":[]}' };
    await fc.assert(
      fc.asyncProperty(
        fc.string({ maxLength: 500 }),
        phrase,
        fc.boolean(),
        async (base, ph, useNull) => {
          const text = base.slice(0, MAX_TEXT_CHARS - ph.length - 1);
          const p = pipelineFor(useNull ? null : noSignals);
          const before = await p.run({ text });
          const after = await p.run({ text: `${text}\n${ph}` });
          return after.riskScore >= before.riskScore;
        },
      ),
      opts,
    );
  });
});

describe("PBT-32 — determinism", () => {
  it("same input and client behaviour give deep-equal verdicts", async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryInput, behavior, async (input, b) => {
        const a = await pipelineFor(b).run(input);
        const c = await pipelineFor(b).run(input);
        expect(c).toEqual(a);
        return true;
      }),
      opts,
    );
  });
});

describe("PBT-34 — failing client still yields rule signals", () => {
  it("rule signals are kept; semantic is degraded unless skipped by policy", async () => {
    await fc.assert(
      fc.asyncProperty(phraseText, failing, async (input, b) => {
        const baseline = await pipelineFor(null).run(input);
        const v = await pipelineFor(b).run(input);
        expect(v.signals.map((s) => s.id)).toEqual(baseline.signals.map((s) => s.id));
        expect(v.riskScore).toBe(baseline.riskScore);
        if (baseline.level === "critical") {
          // Policy skips the semantic layer when rules alone are critical.
          expect(v.semantic).toEqual({ status: "ok", skipped: true });
        } else {
          expect(v.semantic.status).toBe("degraded");
          expect(v.semantic.skipped).toBe(false);
        }
        return true;
      }),
      opts,
    );
  });
});

describe("PBT-35 — null client", () => {
  it("is unavailable and the verdict is valid", async () => {
    await fc.assert(
      fc.asyncProperty(arbitraryInput, async (input) => {
        const v = await createPipeline({ llmClient: null }).run(input);
        return v.semantic.status === "unavailable" && isValid(v);
      }),
      opts,
    );
  });
});

describe("PBT-36 — no_signals has no monster; signals sorted by severity", () => {
  it("holds for arbitrary input and client behaviour", async () => {
    await fc.assert(
      fc.asyncProperty(fc.oneof(arbitraryInput, phraseText), behavior, async (input, b) => {
        const v = await pipelineFor(b).run(input);
        if (v.level === "no_signals" && v.monster !== null) return false;
        for (let i = 1; i < v.signals.length; i++) {
          if (v.signals[i - 1].severity < v.signals[i].severity) return false;
        }
        return true;
      }),
      opts,
    );
  });
});

describe("PBT-37 — evidence cap and no raw LLM leakage", () => {
  it("evidence <= MAX_EVIDENCE_CHARS for long hostnames and paths", async () => {
    const longLabel = fc.stringMatching(/^[a-z0-9]{1,60}$/);
    const longUrl = fc
      .tuple(fc.array(longLabel, { minLength: 3, maxLength: 8 }), fc.stringMatching(/^[a-z0-9/-]{50,400}$/))
      .map(([labels, path]) => `http://${labels.join(".")}.com/${path}`);
    await fc.assert(
      fc.asyncProperty(
        fc.array(longUrl, { minLength: 1, maxLength: 3 }),
        phrase,
        async (urls, ph) => {
          const v = await createPipeline({ llmClient: null }).run({
            text: `${ph} ${urls.join(" ")}`,
            urls,
          });
          return v.signals.every((s) => s.evidence.length <= MAX_EVIDENCE_CHARS);
        },
      ),
      opts,
    );
  });

  it("a marker in a raw LLM response never appears in the verdict", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.stringMatching(/^[A-Z0-9]{12}$/),
        fc.constantFrom(...SEMANTIC_SIGNALS.map((s) => s.id)),
        fc.constantFrom("evidence", "id", "extra", "raw"),
        async (rawMarker, id, where) => {
          const marker = `ZZMARK${rawMarker}`;
          const entry: Record<string, unknown> = {
            id,
            severity: 0.5,
            evidence: "urgent",
          };
          if (where === "evidence") entry.evidence = marker;
          if (where === "id") entry.id = `semantic.${marker}`;
          if (where === "extra") entry.explanation = marker;
          const text =
            where === "raw"
              ? `not json ${marker}`
              : JSON.stringify({ signals: [entry], verdict: marker, score: 100 });
          const v = await createPipeline({
            llmClient: FakeLlmClient.responding(text),
          }).run({ text: "Act now, this is urgent" });
          expect(JSON.stringify(v)).not.toContain(marker);
          return v.signals.every((s) => s.evidence.length <= MAX_EVIDENCE_CHARS);
        },
      ),
      opts,
    );
  });
});
