export interface FittedSize {
  readonly width: number;
  readonly height: number;
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

/**
 * Scales a size down so its longer side is at most `maxDimension`, keeping the
 * aspect ratio within one pixel. Sizes already within the limit are returned
 * unchanged. Any input that is not a positive safe integer gives 0 x 0.
 */
export function fitWithin(width: number, height: number, maxDimension: number): FittedSize {
  if (!isPositiveSafeInteger(width) || !isPositiveSafeInteger(height) || !isPositiveSafeInteger(maxDimension)) {
    return { width: 0, height: 0 };
  }
  const longest = Math.max(width, height);
  if (longest <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
