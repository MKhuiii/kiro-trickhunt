# Tasks — TrickHunt URL Analyzer

## Environment
- OS: Windows, shell: Windows PowerShell 5.1.
- Never chain commands with `&&`; use `;` or run them separately.
- Always make commands non-interactive: `npx --yes`, `--yes` flags.
- Run tests with `vitest run` (single-pass, no watch).

## Task 1 — Scaffold `src/analyzers/`

- [ ] Create the directory `src/analyzers/`
- [ ] Create `src/analyzers/url-analyzer.config.ts` with exported `KNOWN_BRANDS`
      and `SHORTENER_DOMAINS` arrays (REQ-URL-05, REQ-URL-06); seed each with
      at least 10 representative entries
- [ ] Verify `url-analyzer.config.ts` is importable without importing the
      analyzer (REQ-URL-07)

## Task 2 — URL normalization

- [ ] Implement `normalizeUrl(input: string): string | null` in
      `src/analyzers/url-analyzer.ts` following the 8-step procedure in §1.3
      (REQ-URL-01 through REQ-URL-04)
- [ ] Write unit tests in `src/analyzers/url-analyzer.test.ts`:
  - Valid `https` URL returns canonical form
  - Valid `http` URL with default port 80 strips the port
  - `https` URL with default port 443 strips the port
  - Mixed-case hostname is lower-cased
  - Bare word with no scheme returns `null`
  - `ftp://` scheme returns `null`
  - Empty string returns `null`
- [ ] Write property test PBT-06 in `src/analyzers/url-analyzer.property.test.ts`:
      `normalizeUrl(normalizeUrl(s)) === normalizeUrl(s)` for arbitrary strings

## Task 3 — Punycode / homoglyph check

- [ ] Implement `checkPunycodeHost` helper that emits `"url.punycode-host"`
      (REQ-URL-08, REQ-URL-09, REQ-URL-10)
- [ ] Write unit tests:
  - `xn--` label in hostname triggers signal
  - Non-ASCII Unicode character in hostname triggers signal
  - Plain ASCII hostname produces no signal

## Task 4 — IP-address host check

- [ ] Implement `checkIpAddressHost` helper that emits `"url.ip-address-host"`
      (REQ-URL-11, REQ-URL-12, REQ-URL-13)
- [ ] Write unit tests:
  - IPv4 address `http://192.168.1.1/` triggers signal
  - IPv6 address `http://[::1]/` triggers signal
  - Regular hostname `example.com` produces no signal

## Task 5 — At-sign in authority check

- [ ] Implement `checkAtInAuthority` helper that emits `"url.at-in-authority"`
      (REQ-URL-14, REQ-URL-15)
- [ ] Write unit tests:
  - URL with `user@host` triggers signal
  - URL with `user:pass@host` triggers signal
  - URL without credentials produces no signal

## Task 6 — Excessive subdomains check

- [ ] Implement `checkExcessiveSubdomains` helper that emits
      `"url.excessive-subdomains"` (REQ-URL-16, REQ-URL-17)
- [ ] Write unit tests:
  - Hostname with 4 labels triggers signal
  - Hostname with 6 labels triggers signal
  - Hostname with exactly 3 labels produces no signal
  - IPv4 address produces no signal (REQ-URL-17)

## Task 7 — Known URL shortener check

- [ ] Implement `checkKnownShortener` helper that emits `"url.known-shortener"`
      (REQ-URL-18, REQ-URL-19)
- [ ] Write unit tests:
  - `bit.ly` hostname matches and triggers signal
  - `tinyurl.com` hostname matches and triggers signal
  - `example.com` hostname produces no signal
  - Match is case-insensitive

## Task 8 — Brand lookalike check (edit distance)

- [ ] Implement pure `levenshtein(a: string, b: string): number` function
      (REQ-URL-23)
- [ ] Implement `checkBrandLookalike` helper that extracts the registered domain
      stem and applies edit distance against `KNOWN_BRANDS`, emitting
      `"url.brand-lookalike"` (REQ-URL-20 through REQ-URL-22)
- [ ] Write unit tests:
  - `paypa1.com` (edit distance 1 from `paypal`) triggers signal
  - `amaz0n.com` (edit distance 1 from `amazon`) triggers signal
  - `paypal.com` (exact match, distance 0) produces no signal
  - `xyz123.com` (distance > 2 from all brands) produces no signal
- [ ] Write unit test for `levenshtein` directly: distance between identical
      strings is 0; distance between `"kitten"` and `"sitting"` is 3

## Task 9 — Login/verify keywords check

- [ ] Implement `checkCredentialKeywords` helper that emits
      `"url.credential-keywords"` (REQ-URL-24 through REQ-URL-26)
- [ ] Write unit tests:
  - Path `/login` triggers signal with `login` in evidence
  - Path `/secure/account/update` triggers one signal listing all matched keywords
  - Path `/products/shoes` produces no signal
  - Keyword match is case-insensitive

## Task 10 — Assemble `UrlAnalyzer` class

- [ ] Implement `UrlAnalyzer` class that implements `Analyzer<string>` with
      `sourceType: "url"` and calls all check helpers in order
      (REQ-URL-27, REQ-URL-28, REQ-URL-29, REQ-URL-30)
- [ ] Wrap the entire `analyze` body in a try/catch that returns `[]` on any
      unexpected error (REQ-URL-28)
- [ ] Write unit tests:
  - `analyze("")` resolves to `[]`
  - `analyze("not a url")` resolves to `[]`
  - A URL with multiple suspicious traits returns one signal per triggered check
  - All returned signals pass `createSignal` validation
- [ ] Write property tests PBT-07, PBT-08, PBT-09

## Task 11 — Verification

- [ ] Run `vitest run` and confirm all new tests pass with zero failures
- [ ] Confirm no TypeScript errors with `npx tsc --noEmit`
- [ ] Verify no `import` in `src/analyzers/` references `next`, `react`,
      `window`, `document`, or `process`
