/**
 * integration.test.ts — End-to-end integration test for the core engine.
 *
 * Covers the full pipeline:
 *   createSignal → Analyzer → AnalyzerRegistry → aggregate → AggregationResult
 */

import { describe, it, expect } from "vitest";
import {
  createSignal,
  aggregate,
  AnalyzerRegistry,
} from "./index";
import type { Analyzer, Signal } from "./index";

describe("core engine integration", () => {
  it("creates two signals via an analyzer, aggregates them, and returns the correct level", async () => {
    // Two signals with known severities:
    //   signal1: severity = 0.6
    //   signal2: severity = 0.5
    // Noisy-or score = Math.round((1 - (1 - 0.6) * (1 - 0.5)) * 100)
    //                = Math.round((1 - 0.4 * 0.5) * 100)
    //                = Math.round((1 - 0.2) * 100)
    //                = Math.round(0.8 * 100)
    //                = 80 → level "critical"
    const signal1: Signal = createSignal({
      id: "url.suspicious-tld",
      source: "url",
      severity: 0.6,
      evidence: "Domain uses a high-risk TLD (.xyz)",
      whyItMatters: "Scammers often register cheap, obscure domains.",
    });

    const signal2: Signal = createSignal({
      id: "text.urgency-language",
      source: "text",
      severity: 0.5,
      evidence: 'Message contains "Act immediately or lose access"',
      whyItMatters: "Urgency phrases pressure victims into skipping verification.",
    });

    // Concrete analyzer that returns both signals regardless of input.
    const twoSignalAnalyzer: Analyzer<unknown> = {
      sourceType: "url",
      analyze: async (_input: unknown): Promise<Signal[]> => [signal1, signal2],
    };

    const registry = new AnalyzerRegistry();
    registry.register(twoSignalAnalyzer);

    // Run the registry — must resolve, never reject (REQ-ANL-01)
    const signals = await registry.analyze("url", "https://example.xyz");

    expect(signals).toHaveLength(2);

    // Aggregate and verify score + level
    const result = aggregate(signals);

    expect(result.score).toBe(80);
    expect(result.level).toBe("critical");

    // Original signals are preserved unchanged (REQ-AGG-05)
    expect(result.signals).toEqual([signal1, signal2]);
  });

  it("returns no_signals when registry has no matching analyzers", async () => {
    const registry = new AnalyzerRegistry();

    // No analyzers registered — analyze should return empty array
    const signals = await registry.analyze("url", "https://example.com");

    expect(signals).toHaveLength(0);

    const result = aggregate(signals);

    // REQ-AGG-01: empty list → { score: 0, level: "no_signals", signals: [] }
    expect(result.score).toBe(0);
    expect(result.level).toBe("no_signals");
    expect(result.signals).toHaveLength(0);
  });

  it("composes two analyzers with the same sourceType independently (REQ-ANL-04)", async () => {
    // Each analyzer contributes one signal; their outputs are concatenated.
    const analyzerA: Analyzer<unknown> = {
      sourceType: "text",
      analyze: async () => [
        createSignal({
          id: "text.phishing-keyword",
          source: "text",
          severity: 0.7,
          evidence: 'Contains "verify your bank details"',
          whyItMatters: "Classic phishing phrase targeting financial credentials.",
        }),
      ],
    };

    const analyzerB: Analyzer<unknown> = {
      sourceType: "text",
      analyze: async () => [
        createSignal({
          id: "text.spoofed-sender",
          source: "text",
          severity: 0.8,
          evidence: "Sender address mimics a known bank domain",
          whyItMatters: "Spoofed senders make scam messages appear legitimate.",
        }),
      ],
    };

    const registry = new AnalyzerRegistry();
    registry.register(analyzerA);
    registry.register(analyzerB);

    const signals = await registry.analyze("text", "Verify your bank details now");

    // Both analyzers must contribute their signal
    expect(signals).toHaveLength(2);

    // Noisy-or: Math.round((1 - (1 - 0.7) * (1 - 0.8)) * 100)
    //         = Math.round((1 - 0.3 * 0.2) * 100)
    //         = Math.round((1 - 0.06) * 100)
    //         = Math.round(94) = 94 → "critical"
    const result = aggregate(signals);

    expect(result.score).toBe(94);
    expect(result.level).toBe("critical");
  });
});
