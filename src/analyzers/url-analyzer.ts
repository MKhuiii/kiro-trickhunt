/**
 * url-analyzer.ts — URL Analyzer for TrickHunt.
 *
 * Exports normalizeUrl and (in later tasks) the full UrlAnalyzer class.
 */

import { createSignal } from "../core/signal";
import type { Signal } from "../core/signal";
import type { Analyzer } from "../core/analyzer";
import { KNOWN_BRANDS, SHORTENER_DOMAINS } from "./url-analyzer.config";

/**
 * Normalises a URL string following an 8-step procedure.
 *
 * Steps (applied in order):
 *  1. Trim leading/trailing whitespace.
 *  2. If the string has no scheme, prepend `https://`.
 *  3. Parse with the built-in URL constructor. If it throws, return null.
 *  4. Reject any scheme that is not http: or https:; return null.
 *  5. Lower-case the hostname.
 *  6. Remove the default port (:80 for http, :443 for https).
 *  7. Remove a trailing `/` from the pathname only when the path is exactly `/`.
 *  8. Return url.href of the resulting URL object.
 *
 * @returns The normalised URL string, or null if the input cannot be parsed as
 *          an http/https URL.
 *
 * REQ-URL-01 — idempotent: normalizeUrl(normalizeUrl(x)) === normalizeUrl(x)
 * REQ-URL-02 — returns null for non-http/https and unparseable inputs
 * REQ-URL-03 — hostname is lower-cased
 * REQ-URL-04 — default ports are stripped
 */
export function normalizeUrl(input: string): string | null {
  // Step 1: trim whitespace
  const trimmed = input.trim();

  // Step 2: if no scheme is present, prepend https://
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//u.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  // Step 3: parse — return null if the URL constructor throws
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }

  // Step 4: reject non-http/https schemes
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  // Step 5: lower-case the hostname
  url.hostname = url.hostname.toLowerCase();

  // Step 6: remove default ports
  if (
    (url.protocol === "http:" && url.port === "80") ||
    (url.protocol === "https:" && url.port === "443")
  ) {
    url.port = "";
  }

  // Step 7: remove trailing slash only when the pathname is exactly "/"
  if (url.pathname === "/") {
    // The URL spec always stores a bare-host URL with pathname "/".
    // We expose it without the trailing slash for a cleaner canonical form.
    // We reconstruct href without the trailing slash.
    const href = url.href;
    // url.href ends with "/" when pathname is "/", strip it.
    return href.endsWith("/") ? href.slice(0, -1) : href;
  }

  // Step 8: return href
  return url.href;
}

/**
 * Checks whether a parsed URL's hostname uses Punycode-encoded labels (`xn--`)
 * or contains non-Basic-Latin Unicode characters (homoglyphs).
 *
 * Returns a single `"url.punycode-host"` signal when either condition is true;
 * returns an empty array for pure-ASCII hostnames with no `xn--` labels.
 *
 * REQ-URL-08 — signal emitted when any label starts with `xn--`
 * REQ-URL-09 — signal emitted when hostname contains a character outside U+0000–U+007F
 * REQ-URL-10 — no signal for pure-ASCII hostnames with no `xn--` labels
 *
 * NFR-URL-03 — exported named function so it is independently unit-testable.
 *
 * @param url A parsed URL object (from the built-in URL constructor).
 * @returns An array containing zero or one Signal.
 */
export function checkPunycodeHost(url: URL): Signal[] {
  const hostname = url.hostname;

  // REQ-URL-08: any label that starts with "xn--" is Punycode-encoded
  const hasPunycodeLabel = hostname
    .split(".")
    .some((label) => label.toLowerCase().startsWith("xn--"));

  // REQ-URL-09: any character outside Basic Latin (U+0000–U+007F)
  // eslint-disable-next-line no-control-regex
  const hasNonAscii = /[^\u0000-\u007F]/u.test(hostname);

  if (!hasPunycodeLabel && !hasNonAscii) {
    // REQ-URL-10: plain ASCII, no xn-- labels → no signal
    return [];
  }

  return [
    createSignal({
      id: "url.punycode-host",
      source: "url",
      severity: 0.8,
      evidence: hostname,
      whyItMatters:
        "The web address uses special characters that can disguise a fake site as a real one.",
    }),
  ];
}

/**
 * Checks whether a parsed URL's authority contains credentials (i.e. a `@`
 * separator between user info and the host).
 *
 * Browsers silently ignore the `user:password@` prefix and navigate to the
 * actual host after `@`, making this a classic phishing misdirection technique.
 *
 * Returns a single `"url.at-in-authority"` signal when `username` or
 * `password` is non-empty; returns an empty array otherwise.
 *
 * REQ-URL-14 — signal emitted when username or password is non-empty
 * REQ-URL-15 — no signal for URLs with no credentials in the authority
 *
 * NFR-URL-03 — exported named function so it is independently unit-testable.
 *
 * @param url A parsed URL object (from the built-in URL constructor).
 * @returns An array containing zero or one Signal.
 */
export function checkAtInAuthority(url: URL): Signal[] {
  const { username, password, hostname } = url;

  if (username === "" && password === "") {
    // REQ-URL-15: no credentials → no signal
    return [];
  }

  // Reconstruct the authority component to surface in evidence
  const userInfo =
    password !== "" ? `${username}:${password}@${hostname}` : `${username}@${hostname}`;

  return [
    createSignal({
      id: "url.at-in-authority",
      source: "url",
      severity: 0.9,
      evidence: userInfo,
      whyItMatters:
        "The web address contains an '@' symbol, a trick used to hide the real destination.",
    }),
  ];
}

/**
 * Checks whether a parsed URL's hostname is a bare IP address (IPv4 or IPv6).
 *
 * Returns a single `"url.ip-address-host"` signal when either condition is
 * true; returns an empty array for normal domain-name hostnames.
 *
 * IPv4 detection: four dot-separated decimal octets, each in the range 0–255.
 * IPv6 detection: the `URL` constructor wraps IPv6 addresses in brackets, so
 * a hostname of the form `[...]` is treated as IPv6 (REQ-URL-12).
 *
 * REQ-URL-11 — signal emitted for valid IPv4 addresses
 * REQ-URL-12 — signal emitted for IPv6 addresses (bracket-enclosed)
 * REQ-URL-13 — no signal for non-IP hostnames
 *
 * NFR-URL-03 — exported named function so it is independently unit-testable.
 *
 * @param url A parsed URL object (from the built-in URL constructor).
 * @returns An array containing zero or one Signal.
 */
export function checkIpAddressHost(url: URL): Signal[] {
  const hostname = url.hostname;

  // REQ-URL-12: IPv6 addresses are wrapped in brackets by the URL constructor
  const isIPv6 = hostname.startsWith("[") && hostname.endsWith("]");

  // REQ-URL-11: IPv4 — four dot-separated decimal octets, each 0–255
  const isIPv4 = ((): boolean => {
    const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
    if (!match) return false;
    // match[1]–match[4] are the four octets; validate each is in range
    return [match[1], match[2], match[3], match[4]].every((octet) => {
      const n = Number(octet);
      return n >= 0 && n <= 255;
    });
  })();

  if (!isIPv4 && !isIPv6) {
    // REQ-URL-13: regular domain name → no signal
    return [];
  }

  return [
    createSignal({
      id: "url.ip-address-host",
      source: "url",
      severity: 0.7,
      evidence: hostname,
      whyItMatters:
        "The web address goes directly to a numbered computer address instead of a recognisable website name.",
    }),
  ];
}

/**
 * Checks whether a parsed URL's hostname has an excessive chain of subdomains,
 * i.e. more than 3 dot-separated labels.
 *
 * IP addresses (IPv4 and bracketed IPv6) never trigger this check.
 *
 * REQ-URL-16 — signal emitted when the hostname has more than 3 labels
 * REQ-URL-17 — IP addresses do not trigger the check
 *
 * NFR-URL-03 — exported named function so it is independently unit-testable.
 *
 * @param url A parsed URL object (from the built-in URL constructor).
 * @returns An array containing zero or one Signal.
 */
export function checkExcessiveSubdomains(url: URL): Signal[] {
  const hostname = url.hostname;

  // REQ-URL-17: skip IPv6 (bracketed) and IPv4 addresses
  const isIPv6 = hostname.startsWith("[") && hostname.endsWith("]");
  const isIPv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
  if (isIPv6 || isIPv4) {
    return [];
  }

  const labelCount = hostname.split(".").filter((l) => l !== "").length;

  // REQ-URL-16: more than 3 labels fires; exactly 3 does not
  if (labelCount <= 3) {
    return [];
  }

  return [
    createSignal({
      id: "url.excessive-subdomains",
      source: "url",
      severity: 0.5,
      evidence: `${hostname} (${labelCount} parts)`,
      whyItMatters:
        "The web address has an unusually long chain of sub-parts, which can make a fake address look like a real one.",
    }),
  ];
}

/**
 * Checks whether a parsed URL's hostname exactly matches a known URL
 * shortener domain (case-insensitive).
 *
 * REQ-URL-18 — signal emitted when the hostname exactly matches SHORTENER_DOMAINS
 * REQ-URL-19 — no signal otherwise
 *
 * NFR-URL-03 — exported named function so it is independently unit-testable.
 *
 * @param url A parsed URL object (from the built-in URL constructor).
 * @returns An array containing zero or one Signal.
 */
export function checkKnownShortener(url: URL): Signal[] {
  const hostname = url.hostname.toLowerCase();

  const matched = SHORTENER_DOMAINS.find((d) => d.toLowerCase() === hostname);
  if (matched === undefined) {
    return [];
  }

  return [
    createSignal({
      id: "url.known-shortener",
      source: "url",
      severity: 0.4,
      evidence: matched,
      whyItMatters:
        "This is a shortened link that hides the real destination. The actual website could be anything.",
    }),
  ];
}

/**
 * Computes the Levenshtein edit distance between two strings, i.e. the minimum
 * number of single-character insertions, deletions, or substitutions needed to
 * turn `a` into `b`.
 *
 * Pure function with no external dependencies. Uses two rolling rows, so memory
 * is O(min(a.length, b.length)).
 *
 * REQ-URL-23 — pure, dependency-free Levenshtein implementation
 *
 * @param a First string.
 * @param b Second string.
 * @returns The edit distance (a non-negative integer).
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;

  // Keep the shorter string as the row dimension to minimise memory.
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  if (shorter.length === 0) return longer.length;

  let prev: number[] = Array.from({ length: shorter.length + 1 }, (_, i) => i);

  for (let i = 1; i <= longer.length; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= shorter.length; j++) {
      const cost = longer[i - 1] === shorter[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        (prev[j] ?? 0) + 1, // deletion
        (curr[j - 1] ?? 0) + 1, // insertion
        (prev[j - 1] ?? 0) + cost, // substitution
      );
    }
    prev = curr;
  }

  return prev[shorter.length] ?? 0;
}

/**
 * Checks whether the registered-domain stem of a parsed URL's hostname closely
 * resembles (but does not exactly match) a known brand name.
 *
 * The stem is the second-to-last label of the hostname (e.g.
 * `secure.paypa1.com` → `paypa1`). Emits a single `"url.brand-lookalike"`
 * signal for the closest brand when its Levenshtein distance is 1 or 2.
 * IP-address hosts and single-label hosts are skipped.
 *
 * REQ-URL-20 — signal emitted when distance to a brand is ≥ 1 and ≤ 2
 * REQ-URL-21 — no signal when the stem exactly matches a brand
 * REQ-URL-22 — no signal when the distance to all brands is > 2
 *
 * NFR-URL-03 — exported named function so it is independently unit-testable.
 *
 * @param url A parsed URL object (from the built-in URL constructor).
 * @returns An array containing zero or one Signal.
 */
export function checkBrandLookalike(url: URL): Signal[] {
  const hostname = url.hostname.toLowerCase();

  // Skip IPv6 (bracketed) and IPv4 hosts
  const isIPv6 = hostname.startsWith("[") && hostname.endsWith("]");
  const isIPv4 = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname);
  if (isIPv6 || isIPv4) {
    return [];
  }

  const labels = hostname.split(".").filter((l) => l !== "");
  if (labels.length < 2) {
    return [];
  }

  // Second-to-last label is the registered-domain stem
  const stem = labels[labels.length - 2];
  if (stem === undefined || stem === "") {
    return [];
  }

  let closestBrand: string | undefined;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const brand of KNOWN_BRANDS) {
    const normalizedBrand = brand.toLowerCase();
    const distance = levenshtein(stem, normalizedBrand);

    // REQ-URL-21: exact match means the real brand domain → no signal at all
    if (distance === 0) {
      return [];
    }
    if (distance < closestDistance) {
      closestDistance = distance;
      closestBrand = normalizedBrand;
    }
  }

  // REQ-URL-22: nothing within distance 2 → no signal
  if (closestBrand === undefined || closestDistance > 2) {
    return [];
  }

  // REQ-URL-20: distance is 1 or 2
  return [
    createSignal({
      id: "url.brand-lookalike",
      source: "url",
      severity: 0.75,
      evidence: `${stem} looks like ${closestBrand} (edit distance ${closestDistance})`,
      whyItMatters:
        "The website name is very similar to a well-known brand but is not the real site.",
    }),
  ];
}

/** Keywords commonly found in credential-harvesting URL paths (REQ-URL-24). */
const CREDENTIAL_KEYWORDS: readonly string[] = [
  "login",
  "signin",
  "verify",
  "secure",
  "account",
  "update",
  "confirm",
  "password",
  "credential",
  "auth",
];

/**
 * Checks whether a parsed URL's pathname contains words commonly used in
 * credential-harvesting phishing pages (case-insensitive substring match).
 *
 * Emits a single `"url.credential-keywords"` signal listing all matched
 * keywords and the path; returns an empty array when none match.
 *
 * REQ-URL-24 — signal emitted when any keyword appears in the pathname
 * REQ-URL-25 — only one signal, evidence lists all matched keywords
 * REQ-URL-26 — no signal when no keyword is present
 *
 * NFR-URL-03 — exported named function so it is independently unit-testable.
 *
 * @param url A parsed URL object (from the built-in URL constructor).
 * @returns An array containing zero or one Signal.
 */
export function checkCredentialKeywords(url: URL): Signal[] {
  const path = url.pathname;
  const lowerPath = path.toLowerCase();

  const matched = CREDENTIAL_KEYWORDS.filter((kw) => lowerPath.includes(kw));
  if (matched.length === 0) {
    return [];
  }

  return [
    createSignal({
      id: "url.credential-keywords",
      source: "url",
      severity: 0.45,
      evidence: `${matched.join(", ")} in path ${path}`,
      whyItMatters:
        "The web address contains words like 'login' or 'verify' that are often used in fake pages designed to steal passwords.",
    }),
  ];
}

/**
 * UrlAnalyzer — runs every URL check helper in order and concatenates the
 * resulting signals.
 *
 * REQ-URL-27 — implements Analyzer<string> with sourceType "url"
 * REQ-URL-28 — never rejects; returns [] on any unexpected error
 * REQ-URL-29 — returns [] for inputs that cannot be normalised
 * REQ-URL-30 — checks are applied in a fixed order
 */
export class UrlAnalyzer implements Analyzer<string> {
  readonly sourceType = "url" as const;

  async analyze(input: string): Promise<Signal[]> {
    try {
      const normalized = normalizeUrl(input);
      if (normalized === null) {
        return [];
      }
      // normalizeUrl strips the bare-host slash, so re-parse to get a URL object.
      const url = new URL(normalized);

      return [
        ...checkPunycodeHost(url),
        ...checkIpAddressHost(url),
        ...checkAtInAuthority(url),
        ...checkExcessiveSubdomains(url),
        ...checkKnownShortener(url),
        ...checkBrandLookalike(url),
        ...checkCredentialKeywords(url),
      ];
    } catch {
      return [];
    }
  }
}
