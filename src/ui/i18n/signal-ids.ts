import type { MessageKey } from "./en";

/** The 28 signal ids: 12 text, 7 url from the analyzer, 1 url from the reputation lookup, 8 semantic. */
export const KNOWN_SIGNAL_IDS = [
  "text.otp-request",
  "text.urgency",
  "text.threat",
  "text.prize-reward",
  "text.payment-request",
  "text.authority-impersonation",
  "text.off-platform",
  "text.sensitive-data-request",
  "text.job-offer",
  "text.financial-institution",
  "text.investment-pitch",
  "text.romance-bait",
  "url.punycode-host",
  "url.ip-address-host",
  "url.at-in-authority",
  "url.excessive-subdomains",
  "url.known-shortener",
  "url.brand-lookalike",
  "url.credential-keywords",
  "url.reputation-listed",
  "semantic.impersonation-tone",
  "semantic.emotional-manipulation",
  "semantic.too-good-to-be-true",
  "semantic.isolation-secrecy",
  "semantic.relationship-or-job-bait",
  "semantic.pressure-escalation",
  "semantic.romance-money-story",
  "semantic.investment-scheme",
] as const;

export type KnownSignalId = (typeof KNOWN_SIGNAL_IDS)[number];

const KNOWN: ReadonlySet<string> = new Set<string>(KNOWN_SIGNAL_IDS);

/** Dictionary key for a signal explanation; unknown or non-string ids give the generic one. */
export function explanationKeyFor(id: unknown): MessageKey {
  if (typeof id === "string" && KNOWN.has(id)) {
    return `signal.${id as KnownSignalId}.explain`;
  }
  return "signal.unknown.explain";
}
