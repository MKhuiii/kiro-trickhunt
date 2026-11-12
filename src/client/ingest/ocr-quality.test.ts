import { describe, expect, it } from "vitest";
import { assessOcr } from "./ocr-quality";
import { OCR_MIN_CHARS, OCR_MIN_CONFIDENCE } from "./ingest.config";

const good = "x".repeat(OCR_MIN_CHARS);

describe("assessOcr", () => {
  it("returns usable for enough characters and confidence (REQ-CI-18)", () => {
    expect(assessOcr({ text: good, confidence: OCR_MIN_CONFIDENCE })).toBe(
      "usable",
    );
  });

  it("counts only non-whitespace characters", () => {
    const spaced = "a \n\t".repeat(OCR_MIN_CHARS - 1);
    expect(assessOcr({ text: spaced, confidence: 90 })).toBe("too-poor");
  });

  it("returns too-poor for too few characters", () => {
    expect(
      assessOcr({ text: "x".repeat(OCR_MIN_CHARS - 1), confidence: 99 }),
    ).toBe("too-poor");
  });

  it("returns too-poor for low confidence", () => {
    expect(
      assessOcr({ text: good, confidence: OCR_MIN_CONFIDENCE - 0.1 }),
    ).toBe("too-poor");
  });

  it("returns too-poor for non-finite confidence (REQ-CI-19)", () => {
    expect(assessOcr({ text: good, confidence: NaN })).toBe("too-poor");
    expect(assessOcr({ text: good, confidence: Infinity })).toBe("too-poor");
  });

  it("returns too-poor for non-string text or malformed input without throwing", () => {
    expect(
      assessOcr({ text: 42 as unknown as string, confidence: 90 }),
    ).toBe("too-poor");
    expect(assessOcr(null as unknown as { text: string; confidence: number })).toBe(
      "too-poor",
    );
  });

  it("honours valid custom thresholds", () => {
    expect(
      assessOcr({ text: "abc", confidence: 5 }, { minChars: 3, minConfidence: 5 }),
    ).toBe("usable");
  });

  it("falls back to defaults for invalid thresholds", () => {
    const bad = {
      minChars: NaN,
      minConfidence: -1,
    };
    expect(assessOcr({ text: "abc", confidence: 99 }, bad)).toBe("too-poor");
    expect(assessOcr({ text: good, confidence: 99 }, bad)).toBe("usable");
    expect(
      assessOcr(
        { text: good, confidence: 10 },
        { minChars: "1" as unknown as number, minConfidence: Infinity },
      ),
    ).toBe("too-poor");
  });
});
