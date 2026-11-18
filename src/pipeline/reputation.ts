/**
 * reputation.ts — Pipeline step for the optional link reputation lookup.
 *
 * The checker is injected (never imported from src/server). `runReputation`
 * never rejects. `listingSignals` is pure. Evidence holds the host and a
 * category label only: no path, query, fragment or userinfo (REQ-LREP-30).
 */

import type {
  ReputationChecker,
  ReputationHit,
} from "../analyzers/reputation-checker";
import { REPUTATION_LISTED_SIGNAL_ID } from "../analyzers/reputation-checker";
import { normalizeUrl } from "../analyzers/url-analyzer";
import { createSignal } from "../core";
import type { Signal } from "../core";

import {
  CATEGORY_LABELS,
  CATEGORY_PRIORITY,
  LISTED_WHY,
} from "./reputation.config";
import { REPUTATION_LISTED_SEVERITY } from "./rules.config";
import type { Locale, ReputationOutcome } from "./verdict";

export interface ReputationRun {
  readonly outcome: ReputationOutcome;
  readonly signals: readonly Signal[];
}

const DEGRADED_REASONS: readonly string[] = [
  "timeout",
  "provider-error",
  "invalid-response",
  "rate-limited",
];

function degraded(reason: "timeout" | "provider-error" | "invalid-response" | "rate-limited"): ReputationRun {
  return { outcome: { status: "degraded", reason, checkedCount: 0 }, signals: [] };
}

function priorityOf(category: ReputationHit["category"]): number {
  const index = CATEGORY_PRIORITY.indexOf(category);
  return index === -1 ? CATEGORY_PRIORITY.length : index;
}

function hostOf(url: string): string | null {
  try {
    const normalized = normalizeUrl(url);
    if (normalized === null) return null;
    const host = new URL(normalized).hostname;
    return host === "" ? null : host;
  } catch {
    return null;
  }
}

/** One Signal per distinct host, in first-seen order. */
export function listingSignals(
  hits: readonly ReputationHit[],
  locale: Locale,
): Signal[] {
  const best = new Map<string, ReputationHit["category"]>();
  for (const hit of hits) {
    const host = hostOf(hit.url);
    if (host === null) continue;
    const current = best.get(host);
    if (current === undefined || priorityOf(hit.category) < priorityOf(current)) {
      best.set(host, hit.category);
    }
  }
  const labels = CATEGORY_LABELS[locale] ?? CATEGORY_LABELS.en;
  const why = LISTED_WHY[locale] ?? LISTED_WHY.en;
  const signals: Signal[] = [];
  for (const [host, category] of best) {
    try {
      signals.push(
        createSignal({
          id: REPUTATION_LISTED_SIGNAL_ID,
          source: "url",
          severity: REPUTATION_LISTED_SEVERITY,
          evidence: `${host} (${labels[category] ?? labels.other})`,
          whyItMatters: why,
        }),
      );
    } catch {
      // Skip this host.
    }
  }
  return signals;
}

function interpret(result: unknown, locale: Locale): ReputationRun {
  if (typeof result !== "object" || result === null) {
    return degraded("invalid-response");
  }
  const r = result as Record<string, unknown>;
  if (r.status === "degraded") {
    const reason = r.reason;
    return degraded(
      typeof reason === "string" && DEGRADED_REASONS.includes(reason)
        ? (reason as "timeout" | "provider-error" | "invalid-response" | "rate-limited")
        : "invalid-response",
    );
  }
  if (
    r.status === "ok" &&
    Array.isArray(r.hits) &&
    typeof r.checkedCount === "number" &&
    Number.isInteger(r.checkedCount) &&
    r.checkedCount >= 0
  ) {
    const hits = (r.hits as unknown[]).filter(
      (h): h is ReputationHit =>
        typeof h === "object" &&
        h !== null &&
        typeof (h as ReputationHit).url === "string" &&
        typeof (h as ReputationHit).category === "string",
    );
    return {
      outcome:
        r.reason === "too-many-links"
          ? { status: "ok", reason: "too-many-links", checkedCount: r.checkedCount }
          : { status: "ok", checkedCount: r.checkedCount },
      signals: listingSignals(hits, locale),
    };
  }
  return degraded("invalid-response");
}

/** Never rejects. Timeout aborts the checker's signal. */
export async function runReputation(
  checker: ReputationChecker | null,
  urls: readonly string[],
  timeoutMs: number,
  locale: Locale,
): Promise<ReputationRun> {
  if (checker === null || checker === undefined) {
    return { outcome: { status: "not-requested", checkedCount: 0 }, signals: [] };
  }
  if (urls.length === 0) {
    return { outcome: { status: "ok", checkedCount: 0 }, signals: [] };
  }
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<"timeout">((resolve) => {
      timer = setTimeout(() => {
        controller.abort();
        resolve("timeout");
      }, timeoutMs);
    });
    const call = (async () => checker.check(urls, controller.signal))();
    call.catch(() => undefined);
    const winner = await Promise.race([call, timeout]);
    if (winner === "timeout") return degraded("timeout");
    return interpret(winner, locale);
  } catch {
    return degraded("provider-error");
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
