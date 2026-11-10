/**
 * semantic-analyzer.config.ts — Limits and the closed signal set for the
 * Semantic Analyzer.
 *
 * Pure data — no imports (REQ-SEM-05). Edit this file to change ids, caps,
 * limits or explanations without touching analyzer logic or its tests
 * (REQ-SEM-04, NFR-SEM-01).
 */

/** Maximum length of a signal's `evidence` string. */
export const MAX_EVIDENCE_CHARS = 200;

/** Redacted input is truncated to this many characters before sending. */
export const MAX_INPUT_CHARS = 4000;

/** Time allowed for the LLM call, in milliseconds. */
export const TIMEOUT_MS = 8000;

/** Maximum number of signals returned from one analysis. */
export const MAX_SIGNALS = 4;

/** Hard ceiling on any semantic severity; strictly below 1 (REQ-SEM-03). */
export const SEVERITY_CAP = 0.8;

export interface SemanticSignalDef {
  /** Signal id, e.g. "semantic.isolation-secrecy". */
  id: string;
  /** Upper bound for this id's severity; in (0, SEVERITY_CAP]. */
  maxSeverity: number;
  /** Plain-English, non-technical explanation. Never taken from the LLM. */
  whyItMatters: string;
}

export const SEMANTIC_SIGNALS: readonly SemanticSignalDef[] = [
  {
    id: "semantic.impersonation-tone",
    maxSeverity: 0.7,
    whyItMatters:
      "The message sounds like it comes from a bank, agency or company, but the wording does not quite fit. Check by contacting the real organisation using a number you look up yourself.",
  },
  {
    id: "semantic.emotional-manipulation",
    maxSeverity: 0.6,
    whyItMatters:
      "The message plays on fear, guilt or sympathy to make you act before thinking. Scammers use strong feelings to stop you from checking.",
  },
  {
    id: "semantic.too-good-to-be-true",
    maxSeverity: 0.6,
    whyItMatters:
      "The offer promises much more than seems realistic for so little effort. Real opportunities rarely arrive unasked and without a catch.",
  },
  {
    id: "semantic.isolation-secrecy",
    maxSeverity: 0.7,
    whyItMatters:
      "You are asked to keep this private or not talk to family, friends or the bank. Scammers do this so nobody can warn you.",
  },
  {
    id: "semantic.relationship-or-job-bait",
    maxSeverity: 0.6,
    whyItMatters:
      "A sudden friendly contact, romance or easy job offer can be a way to earn your trust before asking for money or details.",
  },
  {
    id: "semantic.pressure-escalation",
    maxSeverity: 0.5,
    whyItMatters:
      "The message pushes you to hurry or keeps raising the stakes. Real organisations usually give you time and other ways to confirm.",
  },
];
