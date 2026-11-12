import { OCR_MIN_CHARS, OCR_MIN_CONFIDENCE } from "./ingest.config";

export interface OcrQualityThresholds {
  readonly minChars?: number;
  readonly minConfidence?: number;
}

function validThreshold(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : fallback;
}

/**
 * Decides whether OCR output is good enough to analyze.
 * Pure; never throws. Invalid thresholds fall back to the config defaults.
 */
export function assessOcr(
  ocr: { text: string; confidence: number },
  thresholds?: OcrQualityThresholds,
): "usable" | "too-poor" {
  try {
    const text: unknown = ocr?.text;
    const confidence: unknown = ocr?.confidence;
    if (typeof text !== "string") return "too-poor";
    if (typeof confidence !== "number" || !Number.isFinite(confidence)) {
      return "too-poor";
    }
    const minChars = validThreshold(thresholds?.minChars, OCR_MIN_CHARS);
    const minConfidence = validThreshold(
      thresholds?.minConfidence,
      OCR_MIN_CONFIDENCE,
    );
    const count = text.replace(/\s+/g, "").length;
    return count >= minChars && confidence >= minConfidence
      ? "usable"
      : "too-poor";
  } catch {
    return "too-poor";
  }
}
