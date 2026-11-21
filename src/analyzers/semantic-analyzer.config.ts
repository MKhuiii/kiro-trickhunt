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
export const SEVERITY_CAP = 0.45;

export interface SemanticSignalDef {
  /** Signal id, e.g. "semantic.isolation-secrecy". */
  id: string;
  /** Upper bound for this id's severity; in (0, SEVERITY_CAP]. */
  maxSeverity: number;
  /** Plain-English, non-technical explanation. Never taken from the LLM. */
  whyItMatters: string;
  /**
   * One-sentence definition sent to the LLM in the system prompt only
   * (rules-tuning-v5). Never shown to users.
   */
  hint: string;
}

/** Extra prompt lines that tell the LLM when not to flag (rules-tuning-v5). */
export const PROMPT_GUIDANCE: readonly string[] = [
  "- Flag a signal only when the message itself uses that tactic on the reader.",
  "- Do not flag ordinary requests between family, friends or colleagues, such as sharing a bill, a gift or a plan.",
  "- Do not flag a message that only describes or warns about a scam without asking the reader to act on it.",
  "- Use semantic.romance-money-story or semantic.investment-scheme only when the message itself asks for money or a payment. Affection between people who know each other, a partner abroad, market news or a club that discusses investing is not enough.",
];

export const SEMANTIC_SIGNALS: readonly SemanticSignalDef[] = [
  {
    id: "semantic.impersonation-tone",
    maxSeverity: 0.45,
    hint: "The sender claims to be a bank, agency, company or known person, and the claim is used to make the reader act.",
    whyItMatters:
      "The message sounds like it comes from a bank, agency or company, but the wording does not quite fit. Check by contacting the real organisation using a number you look up yourself.",
  },
  {
    id: "semantic.emotional-manipulation",
    maxSeverity: 0.45,
    hint: "The message uses fear, guilt, sympathy or affection to push the reader to send money or details.",
    whyItMatters:
      "The message plays on fear, guilt or sympathy to make you act before thinking. Scammers use strong feelings to stop you from checking.",
  },
  {
    id: "semantic.too-good-to-be-true",
    maxSeverity: 0.45,
    hint: "An unrequested prize, refund, income or return that is far larger than the effort or price asked.",
    whyItMatters:
      "The offer promises much more than seems realistic for so little effort. Real opportunities rarely arrive unasked and without a catch.",
  },
  {
    id: "semantic.isolation-secrecy",
    maxSeverity: 0.45,
    hint: "The reader is told to keep it secret, not to call back, or to move to another app away from people who could check.",
    whyItMatters:
      "You are asked to keep this private or not talk to family, friends or the bank. Scammers do this so nobody can warn you.",
  },
  {
    id: "semantic.relationship-or-job-bait",
    maxSeverity: 0.45,
    hint: "A stranger offers friendship, romance or easy paid work to build trust before asking for money or details.",
    whyItMatters:
      "A sudden friendly contact, romance or easy job offer can be a way to earn your trust before asking for money or details.",
  },
  {
    id: "semantic.romance-money-story",
    maxSeverity: 0.45,
    hint: "Sudden affection from a stranger, then a story about being far away, then a request for money or gift cards.",
    whyItMatters:
      "Sudden closeness followed by a story of being far away or short of money, and a request to send money or gift cards, is a common pattern in romance scams.",
  },
  {
    id: "semantic.investment-scheme",
    maxSeverity: 0.45,
    hint: "The message promises high or steady returns or a private group and asks the reader to deposit, top up or pay to join.",
    whyItMatters:
      "The message promises steady profits or a members-only group and asks for money to start. Real investments carry risk and do not promise a fixed return.",
  },
  {
    id: "semantic.pressure-escalation",
    maxSeverity: 0.45,
    hint: "A deadline, threat or penalty pushes the reader to act before they can check. A normal reminder or due date is not pressure.",
    whyItMatters:
      "The message pushes you to hurry or keeps raising the stakes. Real organisations usually give you time and other ways to confirm.",
  },
];

/**
 * Awareness marker (rules-tuning-v5). Not a warning sign: it is never scored
 * and never shown as a signal. The pipeline may use it, together with fixed
 * rules, to lower a `high` level by one step for a genuine scam warning.
 * Only requested when the caller enables it.
 */
export const AWARENESS_SIGNAL_ID = "semantic.scam-awareness";

export const AWARENESS_HINT =
  "The whole message warns the reader about scams to protect them, and asks nothing except ignoring the scam or using official channels.";

export const AWARENESS_PROMPT_RULES: readonly string[] = [
  `- Use ${AWARENESS_SIGNAL_ID} only when the whole message is a warning written to protect the reader.`,
  `- Never use ${AWARENESS_SIGNAL_ID} when the message asks the reader to reply, call, pay, send, click, verify, visit or keep a secret.`,
  `- A message that calls itself a warning, official or real is not enough for ${AWARENESS_SIGNAL_ID}.`,
];
