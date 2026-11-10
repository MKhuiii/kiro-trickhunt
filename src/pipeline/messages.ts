/**
 * messages.ts — Build actions and limitations from configured texts
 * (REQ-PIPE-37 to 42). Pure functions.
 */

import type { Signal } from "../core";
import {
  ACTIONS_BY_MONSTER,
  ACTIONS_BY_SIGNAL,
  ACTIONS_FALLBACK,
  LIMITATIONS_DEGRADED,
  LIMITATIONS_FIXED,
  LIMITATIONS_NO_SIGNALS,
  LIMITATIONS_UNAVAILABLE,
} from "./messages.config";
import type { Locale, MonsterId, RiskLevel, SemanticStatus } from "./verdict";

/** Resolve any value to a supported locale, falling back to "en". */
export function resolveLocale(value: unknown): Locale {
  return value === "vi" ? "vi" : "en";
}

function dedupe(items: readonly string[]): string[] {
  return Array.from(new Set(items));
}

function keyMatches(key: string, id: string): boolean {
  if (key.endsWith(".*")) return id.startsWith(key.slice(0, -1));
  return key === id;
}

export function buildActions(
  monster: MonsterId | null,
  signals: readonly Signal[],
  locale: unknown,
): string[] {
  const loc = resolveLocale(locale);
  const out: string[] = [];

  if (monster !== null) out.push(...ACTIONS_BY_MONSTER[loc][monster]);

  for (const [key, texts] of Object.entries(ACTIONS_BY_SIGNAL[loc])) {
    if (signals.some((s) => keyMatches(key, s.id))) out.push(...texts);
  }

  const result = dedupe(out);
  return result.length > 0 ? result : [...ACTIONS_FALLBACK[loc]];
}

export interface BuildLimitationsParams {
  readonly level: RiskLevel;
  readonly semanticStatus: SemanticStatus;
  readonly locale: unknown;
}

export function buildLimitations(params: BuildLimitationsParams): string[] {
  const loc = resolveLocale(params.locale);
  const out: string[] = [...LIMITATIONS_FIXED[loc]];
  if (params.semanticStatus === "degraded") out.push(...LIMITATIONS_DEGRADED[loc]);
  if (params.semanticStatus === "unavailable")
    out.push(...LIMITATIONS_UNAVAILABLE[loc]);
  if (params.level === "no_signals") out.push(...LIMITATIONS_NO_SIGNALS[loc]);
  return dedupe(out);
}
