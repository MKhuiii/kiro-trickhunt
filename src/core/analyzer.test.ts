/**
 * analyzer.test.ts — Unit tests for AnalyzerRegistry
 *
 * Covers:
 *   - Registry with zero registered analyzers
 *   - Analyzer that returns signals normally
 *   - Analyzer that throws synchronously inside analyze()
 *   - Analyzer that returns a rejected Promise
 *   - Multiple analyzers with the same sourceType (REQ-ANL-04)
 *   - Registry only invokes analyzers whose sourceType matches
 */

import { describe, it, expect, vi } from "vitest";
import { AnalyzerRegistry } from "./analyzer";
import type { Analyzer } from "./analyzer";
import type { Signal } from "./signal";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validSignal: Signal = Object.freeze({
  id: "test.signal",
  source: "url" as const,
  severity: 0.5,
  evidence: "example.com appeared suspicious",
  whyItMatters: "This domain is commonly used in phishing attempts.",
});

const makeAnalyzer = (
  sourceType: Signal["source"],
  impl: (input: unknown) => Promise<Signal[]>
): Analyzer => ({ sourceType, analyze: impl });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("AnalyzerRegistry", () => {
  describe("with zero registered analyzers", () => {
    it("resolves to an empty array (REQ-ANL-01)", async () => {
      const registry = new AnalyzerRegistry();
      const result = await registry.analyze("url", "https://example.com");
      expect(result).toEqual([]);
    });
  });

  describe("with a well-behaved analyzer", () => {
    it("returns the signals the analyzer produces", async () => {
      const registry = new AnalyzerRegistry();
      registry.register(
        makeAnalyzer("url", async () => [validSignal])
      );

      const result = await registry.analyze("url", "https://example.com");
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(validSignal);
    });

    it("only invokes analyzers whose sourceType matches", async () => {
      const registry = new AnalyzerRegistry();
      const textAnalyzer = vi.fn(async () => [validSignal]);
      registry.register(makeAnalyzer("text", textAnalyzer));

      const result = await registry.analyze("url", "https://example.com");
      expect(result).toEqual([]);
      expect(textAnalyzer).not.toHaveBeenCalled();
    });
  });

  describe("fault tolerance (REQ-ANL-01)", () => {
    it("resolves to [] when the analyzer throws synchronously", async () => {
      const registry = new AnalyzerRegistry();
      registry.register(
        makeAnalyzer("url", () => {
          throw new Error("sync boom");
        })
      );

      // Must resolve, not reject
      await expect(
        registry.analyze("url", "https://example.com")
      ).resolves.toEqual([]);
    });

    it("resolves to [] when the analyzer returns a rejected Promise", async () => {
      const registry = new AnalyzerRegistry();
      registry.register(
        makeAnalyzer("url", () => Promise.reject(new Error("async boom")))
      );

      await expect(
        registry.analyze("url", "https://example.com")
      ).resolves.toEqual([]);
    });

    it("returns signals from healthy analyzers when one fails", async () => {
      const registry = new AnalyzerRegistry();

      // First analyzer throws
      registry.register(
        makeAnalyzer("url", () => {
          throw new Error("first fails");
        })
      );

      // Second analyzer succeeds
      registry.register(makeAnalyzer("url", async () => [validSignal]));

      const result = await registry.analyze("url", "https://example.com");
      expect(result).toEqual([validSignal]);
    });
  });

  describe("multiple analyzers for the same sourceType (REQ-ANL-04)", () => {
    it("concatenates signals from all matching analyzers", async () => {
      const registry = new AnalyzerRegistry();

      const signal1: Signal = { ...validSignal, id: "a.one" };
      const signal2: Signal = { ...validSignal, id: "a.two" };

      registry.register(makeAnalyzer("url", async () => [signal1]));
      registry.register(makeAnalyzer("url", async () => [signal2]));

      const result = await registry.analyze("url", "https://example.com");
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(signal1);
      expect(result).toContainEqual(signal2);
    });
  });
});
