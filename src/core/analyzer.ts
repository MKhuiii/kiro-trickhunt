/**
 * analyzer.ts — Analyzer interface and AnalyzerRegistry
 *
 * Pure TypeScript module. No framework, browser, or Node.js imports.
 */

import type { Signal, SignalSource } from "./signal";

/**
 * A pluggable unit that inspects one piece of input and returns zero or more
 * Signal objects (REQ-ANL-01 through REQ-ANL-04).
 *
 * Contract:
 *  - analyze() MUST resolve (never reject) for any input (REQ-ANL-01)
 *  - Every returned Signal MUST satisfy Signal validation rules (REQ-ANL-02)
 *  - analyze() MUST NOT mutate its input (REQ-ANL-03)
 */
export interface Analyzer<TInput = unknown> {
  readonly sourceType: SignalSource;
  analyze(input: TInput): Promise<Signal[]>;
}

/**
 * Registry that holds multiple Analyzer instances and dispatches analysis
 * requests to all analyzers whose sourceType matches (REQ-ANL-04).
 *
 * Guarantees:
 *  - analyze() never rejects — individual analyzer failures are caught and
 *    discarded so the registry always resolves (REQ-ANL-01)
 *  - Results from all matching analyzers are concatenated into a single array
 *    (REQ-ANL-04)
 */
export class AnalyzerRegistry {
  private readonly analyzers: Analyzer[] = [];

  /**
   * Register an analyzer. Multiple analyzers with the same sourceType are
   * allowed and will all be invoked when that source type is requested.
   */
  register(analyzer: Analyzer): void {
    this.analyzers.push(analyzer);
  }

  /**
   * Run all registered analyzers whose sourceType matches `source`, collect
   * their signals, and return the flattened union.
   *
   * This method NEVER rejects (REQ-ANL-01). Each analyzer invocation is
   * individually wrapped in a try/catch so that both synchronous throws and
   * async rejections are silently discarded — the registry always resolves.
   */
  async analyze(source: SignalSource, input: unknown): Promise<Signal[]> {
    const matching = this.analyzers.filter((a) => a.sourceType === source);

    // Wrap each call individually: the try/catch inside safeInvoke catches
    // synchronous throws before a Promise is even returned; .catch() on the
    // resulting Promise catches async rejections (REQ-ANL-01).
    const safeInvoke = (a: Analyzer): Promise<Signal[]> => {
      try {
        return Promise.resolve(a.analyze(input)).catch(() => []);
      } catch {
        return Promise.resolve([]);
      }
    };

    const settled = await Promise.all(matching.map(safeInvoke));

    return settled.flat();
  }
}
