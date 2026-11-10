/**
 * pipeline.config.ts — Limits and policy for the analysis pipeline.
 *
 * Pure data — no imports. Edit here without touching pipeline logic
 * (NFR-PIPE-01).
 */

/** Text is cut to this length; equals the semantic analyzer input limit. */
export const MAX_TEXT_CHARS = 4000;

/** Maximum number of URLs analyzed per run. */
export const MAX_URLS = 5;

/** URLs longer than this are skipped (counted in `urlsSkipped`). */
export const MAX_URL_CHARS = 2048;

/** Longest `Signal.evidence` allowed in a verdict. */
export const MAX_EVIDENCE_CHARS = 200;

/**
 * "when-not-critical": skip the semantic layer when rules alone are critical.
 * "always": run the semantic layer whenever a client and text exist.
 */
export const SEMANTIC_POLICY: "when-not-critical" | "always" =
  "when-not-critical";

/** Pipeline-level semantic timeout; slightly above the analyzer's 8000 ms. */
export const SEMANTIC_TIMEOUT_MS = 9000;
