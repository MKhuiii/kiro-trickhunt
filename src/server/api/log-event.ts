export type LogStatus = 200 | 400 | 413 | 415 | 429 | 500;
export type LogSemanticMode =
  | "used"
  | "budget-exhausted"
  | "not-configured"
  | "skipped"
  | "none";

/** Closed shape: no field can carry user-provided strings (REQ-API-37). */
export interface AnalyzeLogEvent {
  readonly event: "analyze";
  readonly status: LogStatus;
  /** Integer >= 0. */
  readonly durationMs: number;
  readonly semanticMode: LogSemanticMode;
}

/**
 * Writes one JSON line per request.
 * This is the only file in src/server/api/ allowed to use `console`: on Vercel
 * and Node, stdout is the only log channel, and AnalyzeLogEvent has no string
 * field a caller could fill with user content (REQ-API-38).
 */
export function defaultLogEvent(event: AnalyzeLogEvent): void {
  console.info(JSON.stringify(event));
}
