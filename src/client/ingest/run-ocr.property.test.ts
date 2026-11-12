import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { runOcr } from "./run-ocr";
import type { OcrDeps, OcrWorkerLike, OcrWorkerOptions } from "./run-ocr";

const CODES = new Set(["ocr-engine-unavailable", "ocr-timeout", "ocr-aborted", "ocr-failed"]);

type Behavior = "ok" | "throw" | "reject" | "never" | "late" | "malformed";
const behavior = fc.constantFrom<Behavior>("ok", "throw", "reject", "never", "late", "malformed");
const malformedOutputs: unknown[] = [
  undefined,
  null,
  {},
  { data: null },
  { data: { text: 1, confidence: 2 } },
  { data: { text: "x", confidence: Number.NaN } },
  { data: { text: "x" } },
];

const scenario = fc.record({
  loadFails: fc.boolean(),
  create: behavior,
  recognize: behavior,
  malformedIdx: fc.nat(malformedOutputs.length - 1),
  terminateMode: fc.constantFrom("ok", "throw", "reject"),
  abortAt: fc.option(fc.integer({ min: 0, max: 40 }), { nil: undefined }),
  progress: fc.array(fc.oneof(fc.double({ noNaN: false }), fc.constant("x" as unknown as number)), { maxLength: 4 }),
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("runOcr properties", () => {
  /**
   * Property PBT-55: runOcr never rejects, terminates every worker once, closed result shape
   * **Validates: Requirements REQ-CI-32, REQ-CI-33, REQ-CI-34, REQ-CI-35, REQ-CI-36, REQ-CI-37**
   */
  it("PBT-55: never rejects; each created worker terminated exactly once; closed result set", async () => {
    await fc.assert(
      fc.asyncProperty(scenario, async (s) => {
        const registry: { terminate: number }[] = [];
        const makeWorker = (): OcrWorkerLike => {
          const rec = { terminate: 0 };
          registry.push(rec);
          return {
            terminate: () => {
              rec.terminate++;
              if (s.terminateMode === "throw") throw new Error("t");
              if (s.terminateMode === "reject") return Promise.reject(new Error("t"));
              return Promise.resolve();
            },
            recognize: async () => {
              switch (s.recognize) {
                case "ok":
                  return { data: { text: "some text", confidence: 55 } };
                case "throw":
                  throw new Error("r");
                case "reject":
                  return Promise.reject(new Error("r"));
                case "never":
                  return new Promise(() => undefined);
                case "late":
                  await sleep(30);
                  return { data: { text: "late", confidence: 10 } };
                case "malformed":
                  return malformedOutputs[s.malformedIdx];
              }
            },
          };
        };

        const deps: OcrDeps = {
          assetBaseUrl: "https://x.test",
          loadEngine: async () => {
            if (s.loadFails) throw new Error("load");
            return {
              createWorker: async (_l: readonly string[], _o: number, opts: OcrWorkerOptions) => {
                for (const p of s.progress) opts.logger({ status: "recognizing text", progress: p });
                switch (s.create) {
                  case "throw":
                    throw new Error("c");
                  case "reject":
                    return Promise.reject(new Error("c"));
                  case "never":
                    return new Promise<OcrWorkerLike>(() => undefined);
                  case "late":
                    await sleep(30);
                    return makeWorker();
                  default:
                    return makeWorker();
                }
              },
            };
          },
        };

        const ctrl = new AbortController();
        if (s.abortAt !== undefined) setTimeout(() => ctrl.abort(), s.abortAt);
        const seen: number[] = [];
        const result = await runOcr({ canvas: {} }, deps, {
          timeoutMs: 20,
          signal: ctrl.signal,
          onProgress: (p) => {
            seen.push(p.progress);
          },
        });
        await sleep(80); // let late workers settle

        if (result.ok) {
          expect(typeof result.text).toBe("string");
          expect(Number.isFinite(result.confidence)).toBe(true);
        } else {
          expect(CODES.has(result.code)).toBe(true);
        }
        for (const w of registry) expect(w.terminate).toBe(1);
        for (const p of seen) {
          expect(p).toBeGreaterThanOrEqual(0);
          expect(p).toBeLessThanOrEqual(1);
        }
      }),
      { numRuns: 100 },
    );
  }, 60_000);
});
