import { describe, it, expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Validates: Requirements REQ-HUNT-41

const MAX_FILE_BYTES = 30 * 1024;
const MAX_TOTAL_BYTES = 350 * 1024;

const dir = __dirname;
const sizes = readdirSync(dir)
  .filter((n) => statSync(join(dir, n)).isFile())
  .map((name) => ({ name, bytes: statSync(join(dir, name)).size }));

describe("art size budget", () => {
  it("has art files to measure", () => {
    expect(sizes.some((s) => s.name === "registry.tsx")).toBe(true);
  });

  it.each(sizes.map((s) => [s.name, s.bytes] as const))("%s is at most 30 KB", (_name, bytes) => {
    expect(bytes).toBeLessThanOrEqual(MAX_FILE_BYTES);
  });

  it("all art together is at most 350 KB", () => {
    const total = sizes.reduce((sum, s) => sum + s.bytes, 0);
    expect(total).toBeLessThanOrEqual(MAX_TOTAL_BYTES);
  });
});
