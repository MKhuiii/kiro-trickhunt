/**
 * Size and window constants for POST /api/analyze.
 * Plain constants (not env settings) and import-free on purpose (REQ-API-13, REQ-API-36).
 */

/** Equals the pipeline MAX_TEXT_CHARS; a unit test guards the equality. */
export const MAX_TEXT_CHARS = 4000;
/** The pipeline analyzes 5 URLs and counts the rest as skipped. */
export const MAX_URLS_IN = 10;
/** Equals the pipeline MAX_URL_CHARS; a unit test guards the equality. */
export const MAX_URL_CHARS = 2048;
/**
 * 150 KiB. Worst case JSON encoding is 6 bytes per UTF-16 unit (\u00XX):
 * 6 * (4000 + 10 * 2048) = 146 880, plus under 1 KiB for keys and punctuation.
 */
export const MAX_BODY_BYTES = 153_600;

export const RATE_WINDOW_MS = 60_000;
export const LLM_MINUTE_WINDOW_MS = 60_000;
export const LLM_DAY_WINDOW_MS = 86_400_000;

export const MAX_TRACKED_KEYS = 5000;
export const CLEANUP_INTERVAL_MS = 60_000;
export const MAX_KEY_CHARS = 64;
