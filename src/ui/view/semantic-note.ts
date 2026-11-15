import type { Verdict } from "../../pipeline";
import type { MessageKey } from "../i18n/en";

export type SemanticMode = "used" | "budget-exhausted" | "not-configured" | "skipped";

type SemanticNoteKey = Extract<MessageKey, `semantic.${"used" | "skipped" | "budget-exhausted" | "not-configured" | "degraded"}`>;

/**
 * True when the extra AI check was not available (REQ-PAGE-07): mode is
 * budget-exhausted or not-configured, or status is degraded, or status is
 * unavailable with no mode. Total.
 */
export function aiUnavailable(status: unknown, mode?: unknown): boolean {
  if (mode === "budget-exhausted" || mode === "not-configured") return true;
  if (status === "degraded") return true;
  return status === "unavailable" && mode === undefined;
}

/** First-match choice of the note about the extra language check (REQ-UI-20). Total. */
export function semanticNoteKey(verdictSemantic: unknown, mode?: unknown): SemanticNoteKey {
  try {
    const sem =
      typeof verdictSemantic === "object" && verdictSemantic !== null
        ? (verdictSemantic as Partial<Verdict["semantic"]>)
        : {};
    const status = sem.status;
    if (mode === "budget-exhausted") return "semantic.budget-exhausted";
    if (mode === "not-configured") return "semantic.not-configured";
    if (status === "degraded") return "semantic.degraded";
    if (status === "unavailable" && mode === undefined) return "semantic.not-configured";
    if (mode === "skipped" || sem.skipped === true) return "semantic.skipped";
    if (mode === "used" || (status === "ok" && mode === undefined)) return "semantic.used";
    return "semantic.skipped";
  } catch {
    return "semantic.skipped";
  }
}
