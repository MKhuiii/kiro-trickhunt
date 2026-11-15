/**
 * Journey Legs for the hunting step (design A2).
 * Pure and total: bad numbers (NaN, negative, infinite) are treated as 0.
 */

import type { CheckStatus } from "../run-check";

export type Leg = "forest" | "mountain" | "swamp" | "ruins";

const TEXT_LEGS: readonly Leg[] = ["forest", "ruins"];
const IMAGE_LEGS: readonly Leg[] = ["forest", "mountain", "swamp", "ruins"];

export function legsFor(hasImage: boolean): readonly Leg[] {
  return hasImage === true ? IMAGE_LEGS : TEXT_LEGS;
}

function num(n: unknown): number {
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

function statusIndex(status: unknown, legs: readonly Leg[]): number {
  const last = legs.length - 1;
  switch (status) {
    case "qr":
      return legs.length > 2 ? 1 : 0;
    case "ocr-loading":
    case "ocr-recognizing":
      return legs.length > 2 ? 2 : 0;
    case "sending":
      return last;
    default:
      return 0;
  }
}

export function legFor(args: {
  hasImage: boolean;
  status: CheckStatus;
  elapsedMs: number;
  minMs: number;
}): Leg {
  const legs = legsFor(args.hasImage);
  const count = legs.length;
  const elapsed = num(args.elapsedMs);
  const minMs = num(args.minMs);
  // minMs of 0 means no minimum time: the time index is already at the end.
  // Tiny minMs can make minMs / count underflow to 0, so guard the step too.
  const step = minMs / count;
  const rawIdx = step > 0 ? Math.floor(elapsed / step) : count - 1;
  const timeIdx = minMs === 0 || Number.isNaN(rawIdx) ? count - 1 : Math.min(count - 1, rawIdx);
  const idx = Math.max(statusIndex(args.status, legs), timeIdx);
  return legs[Math.min(count - 1, Math.max(0, idx))];
}

export function revealWaitMs(args: {
  elapsedMs: number;
  minMs: number;
  reducedMotion: boolean;
}): number {
  if (args.reducedMotion === true) return 0;
  return Math.max(0, num(args.minMs) - num(args.elapsedMs));
}
