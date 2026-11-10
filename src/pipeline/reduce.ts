/**
 * reduce.ts — Evidence shortening, overlap reduction and sorting.
 *
 * Pure functions. Inputs are never mutated (REQ-PIPE-05, 23..27).
 */

import { createSignal } from "../core";
import type { Signal } from "../core";

import { OVERLAP_GROUPS } from "./overlap.config";
import { MAX_EVIDENCE_CHARS } from "./pipeline.config";

/** Map of signal id -> overlap group index, built once from config. */
const GROUP_BY_ID: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  OVERLAP_GROUPS.forEach((group, index) => {
    for (const id of group) {
      if (!map.has(id)) map.set(id, index);
    }
  });
  return map;
})();

/**
 * Returns signals whose evidence is at most MAX_EVIDENCE_CHARS long.
 * Signals already within the limit are returned as-is; longer ones are
 * rebuilt with createSignal (REQ-PIPE-05). Order is preserved.
 */
export function shortenEvidence(signals: readonly Signal[]): Signal[] {
  return signals.map((s) => {
    if (s.evidence.length <= MAX_EVIDENCE_CHARS) return s;
    const shortened = s.evidence.trimStart().slice(0, MAX_EVIDENCE_CHARS).trim();
    return createSignal({ ...s, evidence: shortened });
  });
}

/** Keeps the strongest signal per key; ties keep the earliest. */
function strongestBy(
  signals: readonly Signal[],
  keyOf: (s: Signal) => string
): Signal[] {
  const best = new Map<string, Signal>();
  for (const s of signals) {
    const key = keyOf(s);
    const current = best.get(key);
    if (current === undefined || s.severity > current.severity) best.set(key, s);
  }
  return [...best.values()];
}

/**
 * Reduces signals for scoring only (REQ-PIPE-23):
 * 1. strongest signal per overlap group (ties: earliest),
 * 2. strongest signal per id,
 * 3. signals in no group are kept after the per-id step.
 */
export function reduceForScoring(signals: readonly Signal[]): Signal[] {
  const grouped: Signal[] = [];
  const ungrouped: Signal[] = [];
  for (const s of signals) {
    (GROUP_BY_ID.has(s.id) ? grouped : ungrouped).push(s);
  }

  const perGroup = strongestBy(grouped, (s) => `g${GROUP_BY_ID.get(s.id)}`);
  const groupedResult = strongestBy(perGroup, (s) => s.id);
  const ungroupedResult = strongestBy(ungrouped, (s) => s.id);

  return [...groupedResult, ...ungroupedResult];
}

/** Returns a new array sorted by severity descending, stable on ties (REQ-PIPE-27). */
export function sortBySeverity(signals: readonly Signal[]): Signal[] {
  return signals
    .map((signal, index) => ({ signal, index }))
    .sort((a, b) => b.signal.severity - a.signal.severity || a.index - b.index)
    .map((entry) => entry.signal);
}
