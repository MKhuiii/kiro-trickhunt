import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { AnalyzeClientResult, AnalyzeRequest, BuildAnalyzeResult } from "../client/ingest";
import { runCheck } from "./run-check";
import type { CheckDeps, CheckInput } from "./run-check";

const NUM_RUNS = 100;

type Behavior = "ok" | "throw" | "reject" | "junk";

const behaviorArb = fc.constantFrom<Behavior>("ok", "throw", "reject", "junk");
const junkArb = fc.oneof(
  fc.constant(undefined),
  fc.constant(null),
  fc.integer(),
  fc.string(),
  fc.array(fc.anything(), { maxLength: 3 }),
  fc.object({ maxDepth: 2 }),
);
const localeArb = fc.constantFrom<"vi" | "en">("vi", "en");
const progressArb = fc.array(
  fc.record({
    stage: fc.oneof(fc.constantFrom("loading tesseract core", "recognizing text"), junkArb),
    progress: fc.oneof(fc.double({ min: 0, max: 1, noNaN: true }), junkArb),
  }),
  { maxLength: 4 },
);

interface Spy {
  ingest: number;
  build: number;
  analyze: number;
  requests: AnalyzeRequest[];
  built: AnalyzeRequest[];
}

interface Plan {
  ingest: Behavior;
  build: Behavior;
  analyze: Behavior;
  junk: unknown;
  progress: unknown[];
  slowProgress: boolean;
}

const planArb: fc.Arbitrary<Plan> = fc.record({
  ingest: behaviorArb,
  build: behaviorArb,
  analyze: behaviorArb,
  junk: junkArb,
  progress: progressArb,
  slowProgress: fc.boolean(),
});

function makeDeps(plan: Plan): { deps: CheckDeps; spy: Spy } {
  const spy: Spy = { ingest: 0, build: 0, analyze: 0, requests: [], built: [] };
  const deps: CheckDeps = {
    async ingestImage(_file, onProgress) {
      spy.ingest++;
      for (const p of plan.progress) {
        if (plan.slowProgress) await new Promise((r) => setTimeout(r, 0));
        onProgress(p as { stage: string; progress: number });
      }
      if (plan.ingest === "throw") throw new Error("ingest");
      if (plan.ingest === "reject") return Promise.reject(new Error("ingest"));
      if (plan.ingest === "junk") return plan.junk as never;
      return {
        ocrText: "ocr",
        qrResults: [],
        notices: [],
        // Image-like data that must never reach the request.
        bytes: new Uint8Array([1, 2, 3]),
      } as never;
    },
    buildAnalyzeRequest(input) {
      spy.build++;
      if (plan.build === "throw") throw new Error("build");
      if (plan.build === "junk") return plan.junk as never;
      const text = [input.userText, input.ocrText].filter(Boolean).join("\n");
      const request: AnalyzeRequest = { text, locale: input.locale } as AnalyzeRequest;
      spy.built.push(request);
      return { request, notices: [] } as BuildAnalyzeResult;
    },
    analyzeRequest(request) {
      spy.analyze++;
      spy.requests.push(request);
      if (plan.analyze === "throw") throw new Error("analyze");
      if (plan.analyze === "reject") return Promise.reject(new Error("analyze"));
      if (plan.analyze === "junk") return Promise.resolve(plan.junk as AnalyzeClientResult);
      return Promise.resolve({
        ok: true,
        verdict: { level: "suspicious" },
        semanticMode: "used",
      } as unknown as AnalyzeClientResult);
    },
  };
  return { deps, spy };
}

const fakeFile = (): File => new File(["x"], "a.png", { type: "image/png" });

function containsBinary(value: unknown): boolean {
  if (value instanceof File || value instanceof Blob) return true;
  if (value instanceof ArrayBuffer || ArrayBuffer.isView(value)) return true;
  if (value !== null && typeof value === "object") {
    return Object.values(value).some(containsBinary);
  }
  return false;
}

describe("runCheck properties (PBT-78)", () => {
  /** **Validates: Requirements REQ-PAGE-18, REQ-PAGE-20** */
  it("never throws or rejects, whatever the dependencies do", async () => {
    await fc.assert(
      fc.asyncProperty(
        planArb,
        fc.string(),
        fc.boolean(),
        localeArb,
        fc.boolean(),
        async (plan, userText, withFile, locale, statusThrows) => {
          const { deps } = makeDeps(plan);
          const input: CheckInput = { userText, file: withFile ? fakeFile() : null, locale };
          const out = await runCheck(deps, input, () => {
            if (statusThrows) throw new Error("ui");
          });
          expect(["nothing", "failed", "done"]).toContain(out.kind);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /** **Validates: Requirements REQ-PAGE-20, REQ-PAGE-35** */
  it("passes analyzeRequest only what buildAnalyzeRequest returned, with no image data", async () => {
    await fc.assert(
      fc.asyncProperty(
        planArb,
        fc.string(),
        fc.boolean(),
        localeArb,
        async (plan, userText, withFile, locale) => {
          const { deps, spy } = makeDeps(plan);
          await runCheck(
            deps,
            { userText, file: withFile ? fakeFile() : null, locale },
            () => {},
          );
          // A junk builder result breaks the typed contract; the checks below
          // apply to any well-formed builder result.
          if (plan.build === "junk") return;
          expect(spy.requests.length).toBeLessThanOrEqual(spy.built.length);
          for (const req of spy.requests) {
            expect(spy.built).toContain(req);
            expect(Object.keys(req).sort()).toEqual(["locale", "text"]);
            expect(containsBinary(req)).toBe(false);
          }
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /** **Validates: Requirements REQ-PAGE-18** */
  it("makes no dependency call and returns nothing for blank text and no file", async () => {
    const blankArb = fc
      .array(fc.constantFrom(" ", "\t", "\n", "\r", "\u00a0", "\u2003"), { maxLength: 20 })
      .map((a) => a.join(""));
    await fc.assert(
      fc.asyncProperty(planArb, blankArb, localeArb, async (plan, userText, locale) => {
        const { deps, spy } = makeDeps(plan);
        const out = await runCheck(deps, { userText, file: null, locale }, () => {});
        expect(out).toEqual({ kind: "nothing" });
        expect(spy).toMatchObject({ ingest: 0, build: 0, analyze: 0 });
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
