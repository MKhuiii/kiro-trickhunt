# Requirements — TrickHunt URL Analyzer

## Overview

The URL Analyzer is a concrete implementation of the `Analyzer<string>` interface
(defined in `src/core/analyzer.ts`) that inspects a single string input,
interprets it as a URL, and returns zero or more `Signal` objects describing
suspicious characteristics.

It lives in `src/analyzers/` and is the first concrete analyzer in the project.
It has no knowledge of UI, LLM, OCR, or QR decoding.

**Hard constraints (inherited from the core engine):**
- `analyze` MUST resolve for every input string — including empty strings,
  non-URLs, and binary garbage (REQ-ANL-01).
- Every returned `Signal` MUST pass `createSignal` validation (REQ-ANL-02).
- No network requests of any kind (NFR-01).
- No imports from `next`, `react`, `window`, `document`, or `process` (NFR-02).
- Brand list and shortener list MUST live in a config file, not in code (see §2).

---

## 1. URL Normalization

### 1.1 Purpose

Normalization converts a raw input string into a canonical URL form before any
signal checks are applied. All checks in §3–§9 operate on the normalized URL.

### 1.2 Shape

`normalizeUrl(input: string): string | null`

Returns `null` when the input cannot be parsed as a URL with an `http` or
`https` scheme. Returns the normalized URL string otherwise.

### 1.3 Normalization steps (applied in order)

1. Trim leading/trailing whitespace.
2. If the string has no scheme, prepend `https://`.
3. Parse with the built-in `URL` constructor. If it throws, return `null`.
4. Reject any scheme that is not `http` or `https`; return `null`.
5. Lower-case the hostname.
6. Remove the default port (`:80` for http, `:443` for https).
7. Remove a trailing `/` from the pathname only when the path is exactly `/`.
8. Return `url.href` of the resulting `URL` object.

### 1.4 Requirements

- **REQ-URL-01** `normalizeUrl` applied twice to any input MUST return the same
  result as applying it once (idempotency).
- **REQ-URL-02** `normalizeUrl` MUST return `null` for inputs that cannot be
  parsed as `http`/`https` URLs (e.g. `ftp://`, bare words, empty string).
- **REQ-URL-03** `normalizeUrl` MUST lower-case the hostname (e.g.
  `PAYPAL.COM` → `paypal.com`).
- **REQ-URL-04** `normalizeUrl` MUST strip default ports (`:80` for http,
  `:443` for https).

---

## 2. Configuration

### 2.1 Config file

Brand and shortener lists live in `src/analyzers/url-analyzer.config.ts` as
plain exported `const` arrays. This file is the only place these lists appear;
the analyzer imports them at module load time.

```ts
// src/analyzers/url-analyzer.config.ts
export const KNOWN_BRANDS: string[] = ["paypal", "amazon", "microsoft", ...];
export const SHORTENER_DOMAINS: string[] = ["bit.ly", "tinyurl.com", ...];
```

### 2.2 Requirements

- **REQ-URL-05** The brand list and shortener list MUST be defined in
  `src/analyzers/url-analyzer.config.ts` and imported by the analyzer —
  they MUST NOT be hard-coded inline in the analyzer logic.
- **REQ-URL-06** Both lists MUST be non-empty in the shipped config file.
- **REQ-URL-07** The config file MUST be independently importable without
  importing the analyzer (no circular dependency).

---

## 3. Check: Punycode / Homoglyph Host

### 3.1 Purpose

Detect hostnames encoded with Punycode (`xn--` labels) or containing
visually deceptive Unicode characters (homoglyphs).

### 3.2 Signal

| Field | Value |
|---|---|
| `id` | `"url.punycode-host"` |
| `source` | `"url"` |
| `severity` | `0.8` |
| `evidence` | The raw hostname string |
| `whyItMatters` | `"The web address uses special characters that can disguise a fake site as a real one."` |

### 3.3 Requirements

- **REQ-URL-08** A signal MUST be emitted when any label in the hostname starts
  with `xn--` (Punycode-encoded internationalized label).
- **REQ-URL-09** A signal MUST be emitted when the hostname contains a Unicode
  character outside the Basic Latin block (U+0000–U+007F) after the URL is
  decoded.
- **REQ-URL-10** No signal MUST be emitted for hostnames that are pure ASCII
  and contain no `xn--` labels.

---

## 4. Check: IP-Address Host

### 4.1 Purpose

Detect URLs whose authority is a bare IP address rather than a domain name,
which is unusual for legitimate services and common in phishing.

### 4.2 Signal

| Field | Value |
|---|---|
| `id` | `"url.ip-address-host"` |
| `source` | `"url"` |
| `severity` | `0.7` |
| `evidence` | The IP address string |
| `whyItMatters` | `"The web address goes directly to a numbered computer address instead of a recognisable website name."` |

### 4.3 Requirements

- **REQ-URL-11** A signal MUST be emitted when the hostname is a valid IPv4
  address (four dot-separated decimal octets, each 0–255).
- **REQ-URL-12** A signal MUST be emitted when the hostname is a valid IPv6
  address (bracket-enclosed, as returned by the `URL` constructor).
- **REQ-URL-13** No signal MUST be emitted for hostnames that are not IP
  addresses.

---

## 5. Check: At-Sign in Authority (`@`)

### 5.1 Purpose

Detect the `user@host` URL syntax, where browsers ignore everything before `@`
and navigate to the host after it. This is a classic phishing misdirection.

### 5.2 Signal

| Field | Value |
|---|---|
| `id` | `"url.at-in-authority"` |
| `source` | `"url"` |
| `severity` | `0.9` |
| `evidence` | The full URL authority component |
| `whyItMatters` | `"The web address contains an '@' symbol, a trick used to hide the real destination."` |

### 5.3 Requirements

- **REQ-URL-14** A signal MUST be emitted when the parsed URL's `username` or
  `password` field is non-empty (i.e. the authority contained `@`).
- **REQ-URL-15** No signal MUST be emitted for URLs with no `@` in the
  authority.

---

## 6. Check: Excessive Subdomains

### 6.1 Purpose

Detect hostnames with an unusually large number of dot-separated labels, a
common technique to bury the real domain deep in the name.

### 6.2 Signal

| Field | Value |
|---|---|
| `id` | `"url.excessive-subdomains"` |
| `source` | `"url"` |
| `severity` | `0.5` |
| `evidence` | The hostname and the subdomain count |
| `whyItMatters` | `"The web address has an unusually long chain of sub-parts, which can make a fake address look like a real one."` |

### 6.3 Requirements

- **REQ-URL-16** A signal MUST be emitted when the hostname contains **more
  than 3** dot-separated labels (e.g. `a.b.c.d.example.com` has 6 labels →
  signal fired; `sub.example.com` has 3 labels → no signal).
- **REQ-URL-17** IP addresses MUST NOT trigger the excessive-subdomains check.

---

## 7. Check: Known URL Shortener

### 7.1 Purpose

Flag URLs whose host is a known URL-shortening service. The destination is
hidden, making it impossible to judge risk without following the link.

### 7.2 Signal

| Field | Value |
|---|---|
| `id` | `"url.known-shortener"` |
| `source` | `"url"` |
| `severity` | `0.4` |
| `evidence` | The matched shortener domain |
| `whyItMatters` | `"This is a shortened link that hides the real destination. The actual website could be anything."` |

### 7.3 Requirements

- **REQ-URL-18** A signal MUST be emitted when the normalized hostname exactly
  matches an entry in `SHORTENER_DOMAINS` (case-insensitive comparison).
- **REQ-URL-19** No signal MUST be emitted when the hostname does not match any
  entry in the list.

---

## 8. Check: Brand Lookalike (Edit Distance)

### 8.1 Purpose

Detect hostnames that closely resemble (but do not exactly match) a known brand
name, using Levenshtein edit distance on the registered domain portion.

### 8.2 Registered domain extraction

For the lookalike check only, use the second-to-last and last label of the
hostname joined with `.` (e.g. `secure.paypa1.com` → `paypa1.com`,
then the stem `paypa1`).

### 8.3 Threshold

A match is triggered when the Levenshtein distance between the extracted stem
and any brand entry in `KNOWN_BRANDS` is **≥ 1 and ≤ 2**, AND the stem is
**not an exact match** (distance = 0) for that brand.

### 8.4 Signal

| Field | Value |
|---|---|
| `id` | `"url.brand-lookalike"` |
| `source` | `"url"` |
| `severity` | `0.75` |
| `evidence` | `"<stem> looks like <brand> (edit distance <n>)"` |
| `whyItMatters` | `"The website name is very similar to a well-known brand but is not the real site."` |

### 8.5 Requirements

- **REQ-URL-20** A signal MUST be emitted when the edit distance between the
  hostname stem and any brand entry is ≥ 1 and ≤ 2.
- **REQ-URL-21** No signal MUST be emitted when the stem exactly matches a
  brand entry (distance = 0) — the URL is already the real brand domain.
- **REQ-URL-22** No signal MUST be emitted when the edit distance to all brand
  entries is > 2.
- **REQ-URL-23** The Levenshtein implementation MUST be a pure function with no
  external dependencies.

---

## 9. Check: Login/Verify Keywords in Path

### 9.1 Purpose

Flag paths that contain words commonly used in phishing pages designed to
harvest credentials.

### 9.2 Keyword list

`login`, `signin`, `verify`, `secure`, `account`, `update`, `confirm`,
`password`, `credential`, `auth`

(Matched case-insensitively as whole words or substrings within a path segment.)

### 9.3 Signal

| Field | Value |
|---|---|
| `id` | `"url.credential-keywords"` |
| `source` | `"url"` |
| `severity` | `0.45` |
| `evidence` | The matched keyword(s) and the path |
| `whyItMatters` | `"The web address contains words like 'login' or 'verify' that are often used in fake pages designed to steal passwords."` |

### 9.4 Requirements

- **REQ-URL-24** A signal MUST be emitted when one or more keywords from the
  list appear anywhere in the URL pathname (case-insensitive).
- **REQ-URL-25** Only one signal MUST be emitted regardless of how many
  keywords are matched; the `evidence` field MUST list all matched keywords.
- **REQ-URL-26** No signal MUST be emitted when no keyword is present in the
  path.

---

## 10. Analyzer Contract

- **REQ-URL-27** The analyzer class MUST implement `Analyzer<string>` with
  `sourceType` set to `"url"`.
- **REQ-URL-28** `analyze` MUST return `Promise<Signal[]>` and MUST NOT throw
  or reject for any string input, including empty strings, non-URLs, and
  arbitrary Unicode (inherits REQ-ANL-01).
- **REQ-URL-29** When the input cannot be normalized (i.e. `normalizeUrl`
  returns `null`), `analyze` MUST return an empty array `[]`.
- **REQ-URL-30** Every signal returned by `analyze` MUST be constructed via
  `createSignal` and MUST pass its validation (inherits REQ-ANL-02).

---

## 11. Property-Based Testing Requirements

| ID | Property | Generator hint |
|---|---|---|
| **PBT-06** | `normalizeUrl(normalizeUrl(s)) === normalizeUrl(s)` for all strings | `fc.string()` including empty |
| **PBT-07** | `analyze(s)` resolves (never rejects) for any string | `fc.string()` and `fc.anything()` coerced to string |
| **PBT-08** | Every signal returned by `analyze(s)` passes `createSignal` without throwing | `fc.webUrl()` and `fc.string()` |
| **PBT-09** | `analyze(s)` returns `[]` for any non-http/https input | `fc.string()` filtered to exclude `http://` and `https://` prefixes |

---

## 12. Out of Scope

- Network requests (DNS lookup, HTTP fetch, redirect following)
- UI rendering
- LLM signal generation
- OCR or QR decoding
- TLD reputation databases (future extension)
- WHOIS or certificate checks

---

## 13. Non-Functional Requirements

- **NFR-URL-01** The analyzer MUST have zero runtime dependencies outside the
  Node.js / browser built-in `URL` constructor and the core engine.
- **NFR-URL-02** The config file (`url-analyzer.config.ts`) MUST be editable
  without touching the analyzer logic or its tests.
- **NFR-URL-03** All checks MUST be independently unit-testable (each check
  function is a named, exported helper or an internally testable unit).
