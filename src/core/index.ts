/**
 * index.ts — Public entry point for the TrickHunt core engine.
 *
 * Import from this module (not from sub-modules) to ensure tree-shakability
 * and a stable public API surface (NFR-03).
 */

export type { SignalSource, Signal } from "./signal";
export { createSignal } from "./signal";

export type { RiskLevel, AggregationResult } from "./aggregator";
export { aggregate } from "./aggregator";

export type { Analyzer } from "./analyzer";
export { AnalyzerRegistry } from "./analyzer";
