import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateImageFile } from "./validate-image-file";
import { MAX_IMAGE_BYTES } from "./ingest.config";

const ALLOWED = ["image/png", "image/jpeg", "image/webp"];

const randomCase = (s: string) =>
  fc.array(fc.boolean(), { minLength: s.length, maxLength: s.length }).map((flags) =>
    s
      .split("")
      .map((c, i) => (flags[i] ? c.toUpperCase() : c.toLowerCase()))
      .join(""),
  );

const typeArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.constantFrom(...ALLOWED).chain(randomCase),
  fc.string(),
  fc.constantFrom("image/gif", "image/png ", "text/plain", ""),
  fc.constant(undefined),
  fc.integer(),
);

const sizeArb: fc.Arbitrary<unknown> = fc.oneof(
  fc.integer({ min: -5, max: MAX_IMAGE_BYTES + 5 }),
  fc.constantFrom(0, 1, MAX_IMAGE_BYTES, MAX_IMAGE_BYTES + 1),
  fc.double({ noNaN: false }),
  fc.constantFrom(NaN, Infinity, -Infinity, 1.5),
  fc.integer({ min: 1, max: MAX_IMAGE_BYTES }),
  fc.string(),
  fc.constant(undefined),
);

describe("validateImageFile properties", () => {
  /**
   * Property PBT-52: validateImageFile exactness and failure code order
   * **Validates: Requirements REQ-CI-01**
   */
  it("PBT-52: ok exactly when type allowed and size valid; failure code follows order", () => {
    fc.assert(
      fc.property(typeArb, sizeArb, (type, size) => {
        const result = validateImageFile({ type, size });

        const typeOk = typeof type === "string" && ALLOWED.includes(type.toLowerCase());
        const sizeInt = typeof size === "number" && Number.isInteger(size) && size >= 1;
        const sizeOk = sizeInt && (size as number) <= MAX_IMAGE_BYTES;

        expect(result.ok).toBe(typeOk && sizeOk);
        if (!typeOk) {
          expect(result).toEqual({ ok: false, code: "unsupported-type" });
        } else if (!sizeInt) {
          expect(result).toEqual({ ok: false, code: "invalid-size" });
        } else if (!sizeOk) {
          expect(result).toEqual({ ok: false, code: "file-too-large" });
        } else {
          expect(result).toEqual({ ok: true });
        }
      }),
      { numRuns: 300 },
    );
  });
});
