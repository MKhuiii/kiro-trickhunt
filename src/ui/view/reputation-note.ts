/**
 * reputation-note.ts — The one neutral note about the link lookup
 * (REQ-LREP-39, 40, 43, 56, 57). Pure and total. It reads only the mode and
 * `verdict.reputation` / signal ids, so level, score and actions never change.
 * Wording lives in the dictionary; no text is written here.
 */

export type ReputationNoteView =
  | { readonly kind: "unavailable"; readonly textKey: "reputation.notice.unavailable" }
  | {
      readonly kind: "not-listed";
      readonly textKey: "reputation.notListed.text";
      readonly limitKey: "reputation.notListed.limit";
    };

const MODES: readonly string[] = [
  "checked",
  "not-requested",
  "not-configured",
  "budget-exhausted",
  "skipped",
  "failed",
];
const STATUSES: readonly string[] = ["ok", "degraded", "unavailable"];
const LISTED_ID = "url.reputation-listed";

const UNAVAILABLE: ReputationNoteView = {
  kind: "unavailable",
  textKey: "reputation.notice.unavailable",
};
const NOT_LISTED: ReputationNoteView = {
  kind: "not-listed",
  textKey: "reputation.notListed.text",
  limitKey: "reputation.notListed.limit",
};

/** Choose the reputation note for a verdict and mode. Never throws. */
export function buildReputationNote(verdict: unknown, mode: unknown): ReputationNoteView | null {
  try {
    if (typeof mode !== "string" || !MODES.includes(mode)) return null;
    if (typeof verdict !== "object" || verdict === null) return null;
    const v = verdict as { reputation?: unknown; signals?: unknown };
    const rep = v.reputation;
    if (typeof rep !== "object" || rep === null) return null;
    const { status, checkedCount } = rep as { status?: unknown; checkedCount?: unknown };
    if (typeof status !== "string" || !STATUSES.includes(status)) return null;
    if (typeof checkedCount !== "number" || !Number.isInteger(checkedCount) || checkedCount < 0) {
      return null;
    }

    if (mode === "failed" || mode === "budget-exhausted" || mode === "not-configured") {
      return UNAVAILABLE;
    }
    if (mode === "checked") {
      if (status !== "ok" || checkedCount < 1) return null;
      const signals = Array.isArray(v.signals) ? (v.signals as unknown[]) : [];
      const listed = signals.some(
        (s) => typeof s === "object" && s !== null && (s as { id?: unknown }).id === LISTED_ID,
      );
      return listed ? null : NOT_LISTED;
    }
    return null;
  } catch {
    return null;
  }
}
