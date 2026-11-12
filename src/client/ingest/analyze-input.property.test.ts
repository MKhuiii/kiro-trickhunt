import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { buildAnalyzeRequest } from "./analyze-input";
import { MAX_TEXT_CHARS, MAX_URL_CHARS, MAX_URLS_IN } from "./ingest.config";
import { classifyQrPayload } from "./qr-payload";
import { readAnalyzeRequest } from "../../server/api/analyze-request";
import { MAX_BODY_BYTES } from "../../server/api/api-limits.config";

const NUM_RUNS = 150;

// Strings with control chars and astral characters mixed in.
const nastyChar = fc.oneof(
  fc.string({ unit: "grapheme", minLength: 1, maxLength: 1 }),
  fc.constantFrom("\u0000", "\u0001", "\u001f", "\u007f", "\n", "\t", "\u2028", "😀", "𝒳", "\ud800", "\udc00"),
);
const textArb = fc.oneof(
  fc.string({ maxLength: 10_000 }),
  fc.array(nastyChar, { maxLength: 6000 }).map((a) => a.join("")),
  // long text sized around the cut point, with astral chars
  fc.integer({ min: MAX_TEXT_CHARS - 3, max: MAX_TEXT_CHARS + 3 }).chain((n) =>
    fc.constantFrom("😀", "a", "\u0000").map((c) => c.repeat(n)),
  ),
);

const hostArb = fc.stringMatching(/^[a-z]{1,12}$/);
const goodUrlArb = fc
  .tuple(fc.constantFrom("http", "https"), hostArb, fc.stringMatching(/^[a-z0-9/_-]{0,40}$/))
  .map(([s, h, p]) => `${s}://${h}.example/${p}`);
const longUrlArb = goodUrlArb.map((u) => u + "a".repeat(MAX_URL_CHARS));

const classificationArb = fc.oneof(
  goodUrlArb.map((url) => ({ kind: "url", url })),
  longUrlArb.map((url) => ({ kind: "url", url })), // violates bounds; must be dropped
  fc.constantFrom("payment", "wifi", "contact", "text", "other").map((kind) => ({ kind })),
  fc.string().map((s) => classifyQrPayload(s)),
  fc.anything(), // malformed
  fc.record({ kind: fc.constant("url"), url: fc.anything() }),
);

const inputArb = fc.record({
  userText: fc.oneof(textArb, fc.anything()),
  ocrText: fc.oneof(textArb, fc.anything()),
  qrResults: fc.oneof(fc.array(classificationArb, { maxLength: 25 }), fc.anything()),
});

function isHttp(u: string): boolean {
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:";
  } catch {
    return false;
  }
}

describe("buildAnalyzeRequest properties", () => {
  /**
   * PBT-48: Wi-Fi payload never leaks.
   * **Validates: Requirements REQ-CI-17**
   */
  it("PBT-48: Wi-Fi payload marker never appears in classification or build result", () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z0-9]{12,40}$/),
        fc.constantFrom("WIFI:", "wifi:", "WiFi:", "wIfI:"),
        fc.string({ maxLength: 200 }),
        fc.string({ maxLength: 200 }),
        (marker, prefix, userText, ocrText) => {
          fc.pre(!userText.includes(marker) && !ocrText.includes(marker));
          const c = classifyQrPayload(`${prefix}S:${marker};T:WPA;P:${marker};;`);
          expect(c.kind).toBe("wifi");
          expect(JSON.stringify(c)).not.toContain(marker);
          const built = buildAnalyzeRequest({ userText, ocrText, qrResults: [c] });
          expect(JSON.stringify(built)).not.toContain(marker);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * PBT-49: request bounds.
   * **Validates: Requirements REQ-CI-12, REQ-CI-13, REQ-CI-14, REQ-CI-15**
   */
  it("PBT-49: never throws and respects text/url bounds", () => {
    fc.assert(
      fc.property(inputArb, (input) => {
        const { request, notices } = buildAnalyzeRequest(input);
        expect(Array.isArray(notices)).toBe(true);
        if (request === null) return;
        expect(Object.keys(request).every((k) => k === "text" || k === "urls")).toBe(true);
        expect(request.text !== undefined || request.urls !== undefined).toBe(true);
        if (request.text !== undefined) {
          expect(request.text.length).toBeGreaterThan(0);
          expect(request.text.length).toBeLessThanOrEqual(MAX_TEXT_CHARS);
        }
        if (request.urls !== undefined) {
          expect(request.urls.length).toBeGreaterThan(0);
          expect(request.urls.length).toBeLessThanOrEqual(MAX_URLS_IN);
          expect(new Set(request.urls).size).toBe(request.urls.length);
          for (const u of request.urls) {
            expect(u.length).toBeLessThanOrEqual(MAX_URL_CHARS);
            expect(isHttp(u)).toBe(true);
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it("PBT-49: request is null when there is nothing to analyze", () => {
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(" ", "\n", "\t"), { maxLength: 10 }).map((a) => a.join("")),
        fc.array(fc.constantFrom("payment", "wifi", "contact", "text", "other"), { maxLength: 6 }),
        (blank, kinds) => {
          const r = buildAnalyzeRequest({
            userText: blank,
            ocrText: blank,
            qrResults: kinds.map((kind) => ({ kind })),
          });
          expect(r.request).toBeNull();
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  /**
   * PBT-50: every non-null request is accepted by the real server parser.
   * **Validates: Requirements REQ-CI-15**
   */
  it("PBT-50: non-null requests are accepted by readAnalyzeRequest and fit MAX_BODY_BYTES", async () => {
    await fc.assert(
      fc.asyncProperty(inputArb, async (input) => {
        const { request } = buildAnalyzeRequest(input);
        fc.pre(request !== null);
        const body = JSON.stringify(request);
        expect(new TextEncoder().encode(body).byteLength).toBeLessThanOrEqual(MAX_BODY_BYTES);
        const parsed = await readAnalyzeRequest(
          new Request("http://localhost/api/analyze", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body,
          }),
        );
        expect(parsed.ok).toBe(true);
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
