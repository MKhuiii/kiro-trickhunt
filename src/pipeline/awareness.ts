/**
 * awareness.ts — The awareness adjustment (rules-tuning-v5).
 *
 * Pure function. Lowers a `high` verdict to `suspicious` only when the LLM
 * marked the message as a scam warning and every fixed condition in
 * awareness.config.ts holds. Otherwise returns the input unchanged.
 */

import type { RiskLevel, Signal } from "../core";
import {
  extractEntities,
  normalizePhrase,
  normalizeText,
  toWordForm,
} from "../analyzers/text-analyzer";

import {
  AWARENESS_FROM_LEVEL,
  AWARENESS_MAX_SCORE,
  AWARENESS_MIN_SEVERITY,
  AWARENESS_TO_LEVEL,
  BLOCKING_SIGNAL_IDS,
  CLAUSE_FILLERS,
  CONTACT_REQUEST_PHRASES,
  IMPERATIVE_VERBS,
  POLITE_PREFIXES,
  REPORTABLE_SIGNAL_IDS,
  REPORTING_CUE_PHRASES,
  WARNING_CUE_PHRASES,
} from "./awareness.config";
import { MAX_INPUT_CHARS, TEXT_PATTERNS } from "../analyzers/text-analyzer.config";
import type { SemanticStatus } from "./verdict";

/** Why the adjustment did or did not apply; used by tests and the probe. */
export type AwarenessReason =
  | "applied"
  | "disabled"
  | "no-marker"
  | "semantic-not-ok"
  | "marker-too-weak"
  | "level-not-high"
  | "no-warning-cue"
  | "has-link-or-number"
  | "blocking-signal"
  | "contact-request"
  | "command-verb";

export interface AwarenessInput {
  readonly enabled: boolean;
  readonly score: number;
  readonly level: RiskLevel;
  readonly signals: readonly Signal[];
  readonly text: string;
  /** URLs given separately to the pipeline (not only those inside the text). */
  readonly inputUrls: readonly string[];
  readonly semanticStatus: SemanticStatus;
  readonly awareness: { readonly severity: number } | null;
}

export interface AwarenessOutput {
  readonly score: number;
  readonly level: RiskLevel;
  readonly applied: boolean;
  readonly reason: AwarenessReason;
}

const norm = (list: readonly string[]): string[] =>
  list.map(normalizePhrase).filter((p) => p.length > 0);

const CUES = norm([...WARNING_CUE_PHRASES.en, ...WARNING_CUE_PHRASES.vi]);
const CONTACTS = norm([...CONTACT_REQUEST_PHRASES.en, ...CONTACT_REQUEST_PHRASES.vi]);
const VERBS = norm([...IMPERATIVE_VERBS.en, ...IMPERATIVE_VERBS.vi]);
const POLITE = norm(POLITE_PREFIXES);
const FILLERS = norm(CLAUSE_FILLERS);
const REPORTING_CUES = norm([...REPORTING_CUE_PHRASES.en, ...REPORTING_CUE_PHRASES.vi]);
/** Normalized phrases of each reportable signal id, taken from the text analyzer config. */
const REPORTABLE_PHRASES: ReadonlyMap<string, readonly string[]> = new Map(
  TEXT_PATTERNS.filter((p) => REPORTABLE_SIGNAL_IDS.includes(p.id)).map((p) => [
    p.id,
    norm([...p.phrases.en, ...p.phrases.vi]),
  ]),
);

function containsPhrase(padded: string, phrase: string): boolean {
  return padded.includes(` ${phrase} `);
}

function startsWithPhrase(words: string, phrase: string): boolean {
  return words === phrase || words.startsWith(`${phrase} `);
}

function blocks(id: string): boolean {
  return BLOCKING_SIGNAL_IDS.some((p) =>
    p.endsWith(".*") ? id.startsWith(p.slice(0, -1)) : p === id,
  );
}

/** Word-boundary occurrences of `phrase` in a space-padded word form. */
function countOccurrences(padded: string, phrase: string): number {
  const needle = ` ${phrase} `;
  let n = 0;
  let from = 0;
  for (;;) {
    const at = padded.indexOf(needle, from);
    if (at === -1) return n;
    n++;
    from = at + 1;
  }
}

/**
 * True when the text only describes the tactic behind signal `id`: at least
 * one of its phrases occurs, and in every clause where one occurs, a
 * reporting cue comes before the first occurrence. Ids not listed in
 * REPORTABLE_SIGNAL_IDS are never reported.
 */
export function isReportedOnly(id: string, text: string): boolean {
  const phrases = REPORTABLE_PHRASES.get(id);
  if (phrases === undefined || phrases.length === 0) return false;
  const capped = text.slice(0, MAX_INPUT_CHARS);
  // Split before normalizing: normalization turns line breaks into spaces.
  const clauses = capped.split(/[.!?;:,\r\n]+/u).map((c) => ` ${toWordForm(c)} `);
  // A phrase the analyzer matched across a clause break is not inside any
  // clause, so it cannot be shown to be reported: keep blocking.
  const whole = ` ${toWordForm(capped)} `;
  for (const p of phrases) {
    const inClauses = clauses.reduce((n, c) => n + countOccurrences(c, p), 0);
    if (countOccurrences(whole, p) > inClauses) return false;
  }
  let found = false;
  for (const clause of clauses) {
    let first = -1;
    for (const p of phrases) {
      const at = clause.indexOf(` ${p} `);
      if (at !== -1 && (first === -1 || at < first)) first = at;
    }
    if (first === -1) continue;
    found = true;
    const before = clause.slice(0, first + 1);
    if (!REPORTING_CUES.some((c) => before.includes(` ${c} `))) return false;
  }
  return found;
}

/** Strip leading filler words ("and", "then", "và", ...) from a clause. */
function stripFillers(clause: string): string {
  let out = clause;
  let changed = true;
  while (changed) {
    changed = false;
    for (const f of FILLERS) {
      if (startsWithPhrase(out, f)) {
        out = out.slice(f.length).trim();
        changed = true;
      }
    }
  }
  return out;
}

/** True when a command verb starts a clause or follows a polite word. */
export function hasCommandVerb(text: string): boolean {
  const clauses = normalizeText(text)
    .split(/[.!?;:,\n]+/u)
    .map((c) => toWordForm(c))
    .filter((c) => c.length > 0);
  for (const raw of clauses) {
    const clause = stripFillers(raw);
    if (VERBS.some((v) => startsWithPhrase(clause, v))) return true;
    const padded = ` ${clause} `;
    for (const p of POLITE) {
      if (VERBS.some((v) => containsPhrase(padded, `${p} ${v}`))) return true;
    }
  }
  return false;
}

export function applyAwarenessAdjustment(input: AwarenessInput): AwarenessOutput {
  const keep = (reason: AwarenessReason): AwarenessOutput => ({
    score: input.score,
    level: input.level,
    applied: false,
    reason,
  });
  try {
    if (!input.enabled) return keep("disabled");
    if (input.awareness === null) return keep("no-marker");
    if (input.semanticStatus !== "ok") return keep("semantic-not-ok");
    if (!(input.awareness.severity >= AWARENESS_MIN_SEVERITY)) return keep("marker-too-weak");
    if (input.level !== AWARENESS_FROM_LEVEL) return keep("level-not-high");

    const padded = ` ${toWordForm(input.text)} `;
    if (!CUES.some((c) => containsPhrase(padded, c))) return keep("no-warning-cue");

    const entities = extractEntities(input.text);
    if (
      input.inputUrls.length > 0 ||
      entities.urls.length > 0 ||
      entities.phoneNumbers.length > 0 ||
      entities.accountNumbers.length > 0
    ) {
      return keep("has-link-or-number");
    }

    if (input.signals.some((s) => blocks(s.id) && !isReportedOnly(s.id, input.text))) {
      return keep("blocking-signal");
    }
    if (CONTACTS.some((c) => containsPhrase(padded, c))) return keep("contact-request");
    if (hasCommandVerb(input.text)) return keep("command-verb");

    return {
      score: Math.min(input.score, AWARENESS_MAX_SCORE),
      level: AWARENESS_TO_LEVEL,
      applied: true,
      reason: "applied",
    };
  } catch {
    return keep("disabled");
  }
}
