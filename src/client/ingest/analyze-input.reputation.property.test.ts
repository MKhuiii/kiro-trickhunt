import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildAnalyzeRequest } from "./analyze-input";
import { readAnalyzeRequest } from "../../server/api/analyze-request";

// Feature: link-reputation-check, Property 129: the request builder sets checkLinks only when the flag is exactly true and the request has a URL

const NUM_RUNS = 150;

const hostArb = fc.stringMatching(/^[a-z]{1,12}$/);
const urlArb = fc
  .tuple(fc.constantFrom("http", "https"), hostArb, fc.stringMatching(/^[a-z0-9/_-]{0,20}$/))
  .map(([s, h, p]) => `${s}://${h}.example/${p}`);
// Plain words: no dots, slashes or colons, so no URL can be extracted.
const plainTextArb = fc.stringMatching(/^[a-z]{1,10}( [a-z]{1,10}){0,5}$/);

const flagArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.constantFrom(true, false, "true", "false", 1, 0, null, undefined, [], {}),
  fc.anything(),
);

// Inputs that do contain a URL, either as a QR url result or inside the text.
const withUrlArb = fc.oneof(
  fc.record({
    userText: fc.oneof(plainTextArb, fc.constant(undefined)),
    qrResults: fc.array(urlArb.map((url) => ({ kind: "url", url })), { minLength: 1, maxLength: 3 }),
  }),
  fc
    .tuple(plainTextArb, urlArb)
    .map(([words, url]) => ({ userText: `${words} ${url}` })),
);

const withoutUrlArb = fc.record({
  userText: plainTextArb,
  qrResults: fc.oneof(
    fc.constant(undefined),
    fc.array(fc.constantFrom({ kind: "wifi" }, { kind: "payment" }, { kind: "text" }), { maxLength: 3 }),
  ),
});

function accepts(request: unknown): Promise<{ ok: boolean; checkLinks?: boolean }> {
  return readAnalyzeRequest(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    }),
  ).then((p) => (p.ok ? { ok: true, checkLinks: p.input.checkLinks } : { ok: false }));
}

describe("analyze-input reputation property tests", () => {
  /**
   * **Validates: Requirements REQ-LREP-02, REQ-LREP-10**
   */
  it("PBT-129: checkLinks is set only to true, only when the flag is exactly true and a URL exists; the parser accepts it", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(withUrlArb, withoutUrlArb),
        flagArb,
        async (base, flag) => {
          const input = { ...base, checkLinks: flag };
          const { request } = buildAnalyzeRequest(input);
          fc.pre(request !== null);
          const present = Object.prototype.hasOwnProperty.call(request, "checkLinks");
          const urlInRequest = /https?:\/\//.test(JSON.stringify(request));
          if (present) {
            expect(request!.checkLinks).toBe(true);
            expect(flag).toBe(true);
            expect(urlInRequest).toBe(true);
          }
          if (flag !== true) expect(present).toBe(false);
          const parsed = await accepts(request);
          expect(parsed.ok).toBe(true);
          expect(parsed.checkLinks).toBe(present ? true : undefined);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it("PBT-129: flag true with a URL always yields checkLinks: true", async () => {
    await fc.assert(
      fc.asyncProperty(withUrlArb, async (base) => {
        const { request } = buildAnalyzeRequest({ ...base, checkLinks: true });
        expect(request?.checkLinks).toBe(true);
        const parsed = await accepts(request);
        expect(parsed).toEqual({ ok: true, checkLinks: true });
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("PBT-129: flag true without any URL never yields checkLinks", () => {
    fc.assert(
      fc.property(withoutUrlArb, (base) => {
        const { request } = buildAnalyzeRequest({ ...base, checkLinks: true });
        expect(request).not.toBeNull();
        expect(Object.prototype.hasOwnProperty.call(request, "checkLinks")).toBe(false);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("PBT-129: any flag other than true never yields checkLinks", () => {
    fc.assert(
      fc.property(
        withUrlArb,
        flagArb.filter((f) => f !== true),
        (base, flag) => {
          const { request } = buildAnalyzeRequest({ ...base, checkLinks: flag });
          expect(request).not.toBeNull();
          expect(Object.prototype.hasOwnProperty.call(request, "checkLinks")).toBe(false);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
