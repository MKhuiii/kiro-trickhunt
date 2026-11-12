import * as fc from "fast-check";
import { describe, it } from "vitest";
import { expect } from "vitest";
import { analyzeRequest, type AnalyzeClientDeps, type ResponseLike } from "./analyze-client";
import type { AnalyzeRequest } from "./types";

const CODES = new Set([
  "invalid-input",
  "payload-too-large",
  "invalid-content-type",
  "rate-limited",
  "internal-error",
  "network-error",
  "timeout",
  "bad-response",
  "unexpected-status",
]);

type Outcome =
  | { kind: "throw" }
  | { kind: "reject" }
  | { kind: "never" }
  | { kind: "response"; status: number; header: string | null; body: unknown; jsonThrows: boolean };

const outcomeArb: fc.Arbitrary<Outcome> = fc.oneof(
  fc.constant<Outcome>({ kind: "throw" }),
  fc.constant<Outcome>({ kind: "reject" }),
  fc.constant<Outcome>({ kind: "never" }),
  fc.record({
    kind: fc.constant("response" as const),
    status: fc.integer({ min: 100, max: 599 }),
    header: fc.option(fc.oneof(fc.string(), fc.integer().map(String), fc.constant("99999")), { nil: null }),
    body: fc.anything(),
    jsonThrows: fc.boolean(),
  }),
);

describe("PBT-56: analyzeRequest is total", () => {
  /** **Validates: Requirements REQ-CI-44 to REQ-CI-49** */
  it("never rejects, returns a closed-set code, and sends a text-and-urls-only POST", async () => {
    await fc.assert(
      fc.asyncProperty(fc.anything(), outcomeArb, async (input, outcome) => {
        const captured: { url?: string; init?: RequestInit } = {};
        const deps: AnalyzeClientDeps = {
          timeoutMs: 5,
          fetch: (url, init) => {
            captured.url = url;
            captured.init = init;
            switch (outcome.kind) {
              case "throw":
                throw new Error("sync");
              case "reject":
                return Promise.reject(new Error("async"));
              case "never":
                return new Promise<ResponseLike>(() => undefined);
              case "response":
                return Promise.resolve({
                  status: outcome.status,
                  headers: { get: () => outcome.header },
                  json: async () => {
                    if (outcome.jsonThrows) throw new SyntaxError("bad json");
                    return outcome.body;
                  },
                });
            }
          },
        };

        const result = await analyzeRequest(input as AnalyzeRequest, deps);

        if (!result.ok) expect(CODES.has(result.code)).toBe(true);
        expect(captured.url).toBe("/api/analyze");
        expect(captured.init?.method).toBe("POST");
        const body: unknown = JSON.parse(String(captured.init?.body));
        expect(typeof body).toBe("object");
        for (const key of Object.keys(body as object)) {
          expect(["text", "urls"]).toContain(key);
        }
      }),
      { numRuns: 100 },
    );
  });
});
