import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { REPUTATION_CONFIG_LIMITS } from "../server/reputation/reputation.config";
import {
  REPUTATION_PIPELINE_TIMEOUT_MS,
  SEMANTIC_TIMEOUT_MS,
} from "./pipeline.config";

const MIN_MARGIN_MS = 2000;

function readMaxDuration(): number {
  const source = readFileSync(
    join(__dirname, "..", "app", "api", "analyze", "route.ts"),
    "utf8",
  );
  const match = /export\s+const\s+maxDuration\s*=\s*(\d+)\s*;/.exec(source);
  if (match === null) throw new Error("maxDuration not found in route.ts");
  return Number(match[1]);
}

const MAX_DURATION_MS = readMaxDuration() * 1000;
const LARGEST_PROVIDER_TIMEOUT_MS = REPUTATION_CONFIG_LIMITS.timeoutMs.max;

describe("timeout constants (REQ-LREP-25, REQ-LREP-26)", () => {
  it("largest provider timeout bound is 6000 ms", () => {
    expect(LARGEST_PROVIDER_TIMEOUT_MS).toBe(6000);
  });

  it("route maxDuration is read as a positive number of seconds", () => {
    expect(MAX_DURATION_MS).toBeGreaterThan(0);
  });

  it("pipeline reputation timeout is above the largest provider bound", () => {
    expect(REPUTATION_PIPELINE_TIMEOUT_MS).toBeGreaterThan(
      LARGEST_PROVIDER_TIMEOUT_MS,
    );
  });

  it("keeps a margin of at least 2000 ms below maxDuration", () => {
    const margin =
      MAX_DURATION_MS - (REPUTATION_PIPELINE_TIMEOUT_MS + SEMANTIC_TIMEOUT_MS);
    expect(margin).toBeGreaterThanOrEqual(MIN_MARGIN_MS);
  });
});

describe("PBT-125 constants: timeout constants keep the margin", () => {
  // **Validates: Requirements REQ-LREP-25, REQ-LREP-26**
  it("holds for every allowed provider timeout", () => {
    const { min, max } = REPUTATION_CONFIG_LIMITS.timeoutMs;
    fc.assert(
      fc.property(fc.integer({ min, max }), (providerTimeout) => {
        expect(REPUTATION_PIPELINE_TIMEOUT_MS).toBeGreaterThan(providerTimeout);
        expect(
          MAX_DURATION_MS -
            (REPUTATION_PIPELINE_TIMEOUT_MS + SEMANTIC_TIMEOUT_MS),
        ).toBeGreaterThanOrEqual(MIN_MARGIN_MS);
      }),
    );
  });
});
