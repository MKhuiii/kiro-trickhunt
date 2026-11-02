/**
 * url-analyzer.ts — URL Analyzer for TrickHunt.
 *
 * Exports normalizeUrl and (in later tasks) the full UrlAnalyzer class.
 */

import { createSignal } from "../core/signal";
import type { Signal } from "../core/signal";

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
