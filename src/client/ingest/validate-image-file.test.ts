import { describe, expect, it } from "vitest";
import { MAX_IMAGE_BYTES } from "./ingest.config";
import { validateImageFile } from "./validate-image-file";

const fail = (code: string) => ({ ok: false, code });

describe("validateImageFile", () => {
  it.each(["image/png", "image/jpeg", "image/webp", "IMAGE/PNG", "Image/JpEg", "image/WEBP"])(
    "accepts allowed type %s",
    (type) => {
      expect(validateImageFile({ type, size: 1000 })).toEqual({ ok: true });
    },
  );

  it.each(["image/gif", "application/pdf", "", "image/png ", "text/plain"])(
    "rejects unsupported type %j",
    (type) => {
      expect(validateImageFile({ type, size: 1000 })).toEqual(fail("unsupported-type"));
    },
  );

  it.each([0, -1, Number.NaN, 1.5, Infinity, "10", null, undefined])(
    "rejects invalid size %j",
    (size) => {
      expect(validateImageFile({ type: "image/png", size })).toEqual(fail("invalid-size"));
    },
  );

  it("accepts MAX_IMAGE_BYTES and rejects one byte more", () => {
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES })).toEqual({ ok: true });
    expect(validateImageFile({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toEqual(
      fail("file-too-large"),
    );
  });

  it("reports unsupported type before size problems", () => {
    expect(validateImageFile({ type: "image/gif", size: 0 })).toEqual(fail("unsupported-type"));
  });

  it("handles missing properties and non-object inputs", () => {
    expect(validateImageFile({})).toEqual(fail("unsupported-type"));
    expect(validateImageFile({ type: "image/png" })).toEqual(fail("invalid-size"));
    expect(validateImageFile({ size: 10 })).toEqual(fail("unsupported-type"));
    expect(validateImageFile(null)).toEqual(fail("unsupported-type"));
    expect(validateImageFile(undefined)).toEqual(fail("unsupported-type"));
    expect(validateImageFile("file")).toEqual(fail("unsupported-type"));
  });

  it("does not throw on hostile getters", () => {
    const hostile = {
      get type(): string {
        throw new Error("boom");
      },
    };
    expect(validateImageFile(hostile)).toEqual(fail("unsupported-type"));
  });
});
