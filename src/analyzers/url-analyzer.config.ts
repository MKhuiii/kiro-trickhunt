/**
 * url-analyzer.config.ts — Static brand and shortener lists for the URL Analyzer.
 *
 * Pure data — no imports. Edit this file to update the lists without touching
 * analyzer logic or its tests (REQ-URL-05, NFR-URL-02).
 */

/**
 * Lowercase domain stems (no TLD) of well-known brands that are frequent
 * phishing targets. Used for edit-distance lookalike detection (REQ-URL-06).
 */
export const KNOWN_BRANDS: string[] = [
  "paypal",
  "amazon",
  "microsoft",
  "apple",
  "google",
  "facebook",
  "netflix",
  "instagram",
  "twitter",
  "linkedin",
  "ebay",
  "chase",
  "wellsfargo",
  "bankofamerica",
  "dropbox",
];

/**
 * Full domains of known URL-shortening services. Used for shortener detection
 * (REQ-URL-06). Comparison is case-insensitive.
 */
export const SHORTENER_DOMAINS: string[] = [
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "ow.ly",
  "buff.ly",
  "short.link",
  "rebrand.ly",
  "bl.ink",
  "clck.ru",
  "is.gd",
  "cutt.ly",
];
