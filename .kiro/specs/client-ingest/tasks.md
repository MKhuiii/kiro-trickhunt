# Implementation Plan: Client Ingest

## Overview

Build the browser-side image and QR ingest in `src/client/ingest/`: a pure core,
adapters with injected dependencies, the analyze client, self-hosted OCR and QR
assets, a temporary try page and a README section. No change to `src/core`,
`src/analyzers`, `src/pipeline`, `src/server` or the `POST /api/analyze` contract.

## Environment

- OS: Windows, shell: Windows PowerShell 5.1.
- Never chain commands with `&&`; use `;` or run them separately.
- Always make commands non-interactive: `npx --yes`, `--yes` flags.
- Package names that start with `@` must be quoted in PowerShell, for example
  `'@tesseract.js-data/eng@1.0.0'`, or `@` is read as splatting.
- Run tests with `vitest run` (single pass, no watch). Vitest includes only
  `src/**/*.test.ts` in the `node` environment.
- Tests never touch the network and never need a browser: use fakes for the
  decoder, canvas, QR reader, OCR engine and `fetch`.
- Relative imports only, no path alias.
- Client source must not import from `src/server/`; test files may.
- Do not edit `src/core/`, `src/analyzers/`, `src/pipeline/`, `src/server/` or
  `src/app/api/`.
- Do not implement beyond the task being executed.

## Tasks

- [x] 1. Dependencies, config and self-hosted assets
  - [x] 1.1 Add pinned dependencies, npm scripts and ignore rules
    - `npm install --save-exact tesseract.js@7.0.0 tesseract.js-core@7.0.0 zxing-wasm@3.1.6`
    - `npm install --save-dev --save-exact '@tesseract.js-data/eng@1.0.0' '@tesseract.js-data/vie@1.0.0' qrcode-generator@2.0.4`
    - Confirm none of the six entries in `package.json` has `^` or `~`
    - Add scripts `prepare:assets` (`node scripts/copy-client-assets.mjs`), `predev` and `prebuild` (both run `npm run prepare:assets`)
    - Add `/public/tesseract/` and `/public/zxing/` to `.gitignore`
    - _Requirements: REQ-CI-51, REQ-CI-53, REQ-CI-54_
  - [x] 1.2 Create `ingest.config.ts` and `types.ts`
    - Constants block from the design (import-free); structural types for `ImageDataLike`, `CanvasLike`, `ImageFileLike`, `QrClassification`, `AnalyzeRequest`
    - _Requirements: REQ-CI-05, REQ-CI-11, NFR-CI-02_
  - [x] 1.3 Create `assets.manifest.json` and `scripts/copy-client-assets.mjs`
    - Manifest entries `from`, `to`, `bytes`, `sha256` for the nine files of the design table plus the four license files; compute bytes and SHA-256 with `Get-FileHash -Algorithm SHA256` from the installed packages and check the bytes against the design table
    - Script: ESM, no dependencies, resolves paths from the repository root, creates folders, skips a file when size and hash match, exits non-zero with a fixed message when a source is missing or a hash differs, never prints file contents
    - Run `npm run prepare:assets` twice (second run must copy nothing) and confirm the files exist under `public/tesseract/` and `public/zxing/`
    - _Requirements: REQ-CI-52, REQ-CI-53_
  - [x] 1.4 Create `THIRD_PARTY_NOTICES.md` at the repository root
    - One row per shipped component from the design license table with name, version, license and source URL; note that license files are copied next to the assets and that `qrcode-generator` is dev only
    - _Requirements: REQ-CI-55_
  - [x] 1.5 Guard tests `limits.test.ts` and `assets.test.ts`
    - `limits.test.ts` imports `src/server/api/api-limits.config` and the client config and asserts `MAX_TEXT_CHARS`, `MAX_URLS_IN`, `MAX_URL_CHARS` are equal
    - `assets.test.ts` imports the manifest and asserts that `ASSET_PATHS.ocrWorker`, `zxingWasm`, the three core file names under `ocrCoreDir`, and `<lang>.traineddata.gz` for each of `OCR_LANGUAGES` under `ocrLangDir` each match a manifest `to` path (after removing the leading `public`), and that every entry has a positive `bytes` and a 64-character hex `sha256`
    - _Requirements: REQ-CI-54, REQ-CI-56_

- [x] 2. Pure core
  - [x] 2.1 Create `validate-image-file.ts` and `fit-within.ts`
    - Read properties inside `try/catch`; first failing code in the fixed order; `fitWithin` domain is positive safe integers, otherwise `{ 0, 0 }`
    - _Requirements: REQ-CI-01, REQ-CI-02, REQ-CI-03, REQ-CI-04_
  - [x] 2.2 Unit tests for both files
    - Allowed types in mixed case; unsupported type; `0`, negative, `NaN`, `1.5` size; `MAX_IMAGE_BYTES` accepted and `+1` rejected; missing properties
    - `fitWithin`: unchanged when small; 4800x2400 to 2400x1200; 1x100000 keeps side at least 1; invalid input gives zeros
    - _Requirements: REQ-CI-01 to REQ-CI-04_
  - [x] 2.3 Property tests PBT-51 and PBT-52 in `fit-within.property.test.ts` and `validate-image-file.property.test.ts`
    - **Property: fitWithin bounds and ratio (PBT-51)**
    - **Property: validateImageFile exactness (PBT-52)**
    - **Validates: Requirements REQ-CI-01, REQ-CI-03**
  - [x] 2.4 Create `qr-payload.ts`
    - `isHttpUrl` and `classifyQrPayload` with the order of REQ-CI-07, frozen results, prefixes read from the config
    - _Requirements: REQ-CI-06, REQ-CI-07, REQ-CI-08, REQ-CI-09, REQ-CI-10, REQ-CI-11_
  - [x] 2.5 Unit tests for `qr-payload.ts` and property test PBT-47
    - Examples: `https://a.example/x`, `http://` with no host, `javascript:alert(1)`, `ftp://h/x`, URL with a space, URL over `MAX_URL_CHARS`, `WIFI:T:WPA;S:n;P:p;;` in two cases, `000201...`, `BEGIN:VCARD`, `mailto:`, `tel:`, `sms:`, `hello world`, empty, blank, non-string
    - **Property: classification total and closed (PBT-47)**
    - **Validates: Requirements REQ-CI-06 to REQ-CI-10**
  - [x] 2.6 Create `analyze-input.ts`
    - `buildAnalyzeRequest` as in the design: defensive reads, join, surrogate-safe cut, URL filter with `isHttpUrl`, de-duplication, notices in fixed order
    - _Requirements: REQ-CI-12, REQ-CI-13, REQ-CI-14, REQ-CI-15, REQ-CI-16, REQ-CI-17_
  - [x] 2.7 Unit tests and property tests PBT-48, 49, 50 in `analyze-input.test.ts` and `analyze-input.property.test.ts`
    - Examples: screenshot text plus one `.example` URL gives both fields; Wi-Fi only gives `request: null` with `wifi-qr`; payment gives `payment-qr`; contact only gives `no-url`; text over 4000 units gives `text-truncated`; emoji at the cut point leaves no lone surrogate; duplicate URLs collapse; 11 distinct URLs keep 10
    - **Property: Wi-Fi payload never leaks (PBT-48)**
    - **Property: request bounds (PBT-49)**
    - **Property: request accepted by the real server parser (PBT-50)**; build `new Request("http://localhost/api/analyze", { method: "POST", headers: { "content-type": "application/json" }, body })` and call `readAnalyzeRequest` from `src/server/api/analyze-request`
    - **Validates: Requirements REQ-CI-12 to REQ-CI-17**
  - [x] 2.8 Create `ocr-quality.ts` with unit tests
    - Usable, too few characters, low confidence, `NaN`, non-string, invalid thresholds fall back to defaults
    - _Requirements: REQ-CI-18, REQ-CI-19_

- [x] 3. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Adapters
  - [x] 4.1 Create `prepare-image.ts`
    - Validate, race decode against `PREPARE_TIMEOUT_MS`, close late bitmaps, size checks, canvas redraw, `getImageData`, `finally` closes once, zero the canvas on failure, idempotent `dispose()`
    - _Requirements: REQ-CI-20 to REQ-CI-26_
  - [x] 4.2 Unit tests and property test PBT-53 for `prepare-image.ts`
    - Examples: too-large file never calls the decoder; decoder throws; zero size; `too-many-pixels`; `createCanvas` returns `null`; `getContext` returns `null`; large image is drawn at the fitted size; `close` count is 1 on success and on each failure; `dispose` twice is safe
    - **Property: prepareImage total and leak-free (PBT-53)**
    - **Validates: Requirements REQ-CI-20 to REQ-CI-25**
  - [x] 4.3 Create `zxing-reader.ts` and `decode-qr.ts`
    - `createZxingReader(lib)` with `formats: ["QRCode"]`, `maxNumberOfSymbols: QR_MAX_RESULTS`, `textMode: "Plain"`; `decodeQr` with loader errors, timeout and output filtering
    - _Requirements: REQ-CI-27, REQ-CI-28, REQ-CI-29_
  - [x] 4.4 Unit tests and property test PBT-54 for the QR files
    - Examples: loader throws gives `qr-engine-unavailable`; reader throws or hangs gives `qr-decode-failed`; items with `isValid: false`, empty text, over-long text and wrong types are ignored; only the first valid item is returned; fake `lib.readBarcodes` receives exactly the three options
    - **Property: decodeQr total and bounded (PBT-54)**
    - **Validates: Requirements REQ-CI-27, REQ-CI-28, REQ-CI-29**
  - [x] 4.5 Create `run-ocr.ts`
    - One `finish` function, timer, abort listener, `register`/`terminateOnce` for every worker including late ones, progress mapper, output validation, options exactly as in the design table
    - Before coding, re-read `node_modules/tesseract.js/src/index.d.ts` and `docs/api.md` to confirm the option names; do not guess
    - _Requirements: REQ-CI-32 to REQ-CI-37_
  - [x] 4.6 Unit tests and property test PBT-55 for `run-ocr.ts`
    - Examples: success returns text and confidence and terminates once; engine load fails gives `ocr-engine-unavailable`; `createWorker` receives `["vie","eng"]`, `1` and options whose three paths start with `assetBaseUrl`, with `workerBlobURL: false` and `cacheMethod: "none"`; `recognize` receives only the canvas; a never-resolving `recognize` gives `ocr-timeout` and one `terminate`; abort gives `ocr-aborted`; a worker created after the timeout is still terminated once; a throwing `terminate` is ignored; progress is clamped and a throwing callback is ignored
    - **Property: runOcr total and every worker terminated once (PBT-55)**
    - **Validates: Requirements REQ-CI-32 to REQ-CI-37**
  - [x] 4.7 Create `ingest-image.ts`
    - Fixed order, classification right after decoding, skip flag, `assessOcr`, `errorCode` rule, `finally` disposes once, outer `try/catch` to `unexpected`
    - _Requirements: REQ-CI-38 to REQ-CI-43_
  - [x] 4.8 Unit tests and property test PBT-57 for `ingest-image.ts`
    - Examples (end to end with fakes): screenshot text plus a QR with `https://secure-login.example/verify` gives `ocrText` and one `url` result and `buildAnalyzeRequest` then gives both fields; Wi-Fi QR gives `{ kind: "wifi" }` and no payload text anywhere in the result; payment QR likewise; oversize file gives `file-too-large` and no stage runs; OCR timeout with a QR present gives the QR result, notice `ocr-failed` and no `errorCode`; skip flag gives `ocr-skipped` and the OCR fake is not called; image with no text and no QR gives no `errorCode`
    - **Property: ingestImage total, disposes once, no payload leak (PBT-57)**
    - **Validates: Requirements REQ-CI-38 to REQ-CI-43**
  - [x] 4.9 Create `analyze-client.ts`
    - Sanitized body, fixed fetch options, `AbortController` plus `Promise.race`, error mapping, `Retry-After` clamp, structural check of a 200 body, default deps built inside the file, `import type { Verdict }` only
    - _Requirements: REQ-CI-44 to REQ-CI-50_
  - [x] 4.10 Unit tests and property test PBT-56 for `analyze-client.ts`
    - Examples: success returns verdict and `semanticMode`; 400, 413, 415, 429 (`Retry-After: 12`, missing, `abc`, `99999`), 500 map to the fixed codes; body with an unknown code falls back to the status; 502 gives `unexpected-status`; `fetch` throws gives `network-error`; ignored abort gives `timeout`; 200 with a malformed body gives `bad-response`; captured init has `POST`, the header, `same-origin`, `no-store`, `no-referrer`; input with extra properties (for example `image`) sends only `text` and `urls`
    - **Property: analyzeRequest total with a text-and-urls-only body (PBT-56)**
    - **Validates: Requirements REQ-CI-44 to REQ-CI-49**
  - [x] 4.11 Round-trip property test PBT-58 in `qr-roundtrip.property.test.ts`
    - Use `qrcode-generator` (set `qrcode.stringToBytes` to a `TextEncoder` UTF-8 encoder), render modules into `{ data, width, height }` with a 4-module quiet zone and scale 4, load `zxing-wasm/reader` with `prepareZXingModule({ overrides: { wasmBinary } })` read from `node_modules`, and read with `decodeQr` through `createZxingReader`; `numRuns` 50; also fixed examples for a URL, a Wi-Fi string and a Vietnamese string
    - **Property: QR round trip (PBT-58)**
    - **Validates: Requirements REQ-CI-27, REQ-CI-28, REQ-CI-29**

- [x] 5. Browser wiring and guards
  - [x] 5.1 Create `browser-deps.ts` and `index.ts`
    - `createBrowserIngestDeps()` as in the design: `createImageBitmap`, canvas element, memoized `zxing-wasm/reader` loader with the `locateFile` override, memoized `tesseract.js` loader, `location.origin` as asset base; both libraries only inside `import()` calls in functions
    - `index.ts` exports the public functions and types
    - _Requirements: REQ-CI-30, REQ-CI-32, REQ-CI-59_
  - [x] 5.2 Create `boundaries.test.ts` (source scans of non-test files)
    - No import path containing `server/` under `src/client` and `src/app/try`; no `XMLHttpRequest`, `sendBeacon`, `WebSocket`, `EventSource`; `fetch(` only in `analyze-client.ts`
    - No `localStorage`, `sessionStorage`, `indexedDB`, `document.cookie`, `caches.`
    - `tesseract.js` and `zxing-wasm` appear only in `import(` form; no `jsdelivr`, `unpkg`, `projectnaptha`
    - Pure modules contain no `window`, `document`, `navigator`, `fetch` or `process`
    - The `src/app/try` folder is scanned when it exists; re-run the test after task 7.1
    - _Requirements: REQ-CI-57, REQ-CI-58, REQ-CI-59, REQ-CI-60, REQ-CI-44_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Temporary try page
  - [x] 7.1 Create `src/app/try/page.tsx`
    - `"use client"`, a first-line comment that marks the page temporary and to be replaced by the real UI, labelled file input, drop area, paste handler, labelled text area, a button, a `role="status"` region with `aria-live="polite"`, `<pre>` blocks for OCR text, QR kinds (URL for `url` results only), notices, error codes and the final JSON; deps created once with `useRef`; `analyzeRequest` called only when `request !== null`; no styles, no `px` font sizes, no object URLs, no storage, no link from other pages
    - _Requirements: REQ-CI-61 to REQ-CI-66_
  - [x] 7.2 Manual check in a real browser (done by the user; not automated)
    - `npm run dev`, open `/try`, keep the Network tab open
    - Screenshot with text: OCR text appears; the only non-asset request is `POST /api/analyze` with a JSON body that has `text` and `urls` only and no image
    - Image with a QR code of a link; with a Wi-Fi QR; with a payment-style QR: kinds and notices are right and nothing from non-URL payloads shows
    - All requests go to the same origin (no jsDelivr, unpkg or other host); `.gz` language files load without a decompression error; `.wasm` loads with a working response type; first OCR download is about 5.6 MiB
    - A photo with EXIF rotation reads upright; a file over 10 MiB and a GIF show the fixed error codes; rate-limited behavior shows `retryAfterSec`
    - Application tab shows no new `localStorage`, `sessionStorage` or IndexedDB entries
    - Record what was seen; fix assumptions marked unverified in the design (`.gz` serving, progress status string, orientation, Turbopack bundling of `tesseract.js`)
    - _Requirements: REQ-CI-58, REQ-CI-62 to REQ-CI-64_

- [x] 8. Documentation
  - [x] 8.1 Add the README section "Image and QR input (browser)"
    - What runs in the browser (decode, downscale, QR, OCR) and what runs on the server (`POST /api/analyze` with `text` and `urls` only); privacy statement; one-QR-per-image limit; OCR accuracy caveat; formats and size limits; how assets reach `public/` (`predev`/`prebuild`, `npm run prepare:assets`); first-use download sizes; location of `THIRD_PARTY_NOTICES.md`; `/try` is temporary
    - _Requirements: REQ-CI-31, REQ-CI-67, REQ-CI-68, REQ-CI-69_

- [x] 9. Final verification
  - [x] 9.1 Run checks and confirm contracts unchanged
    - `vitest run`, `npx tsc --noEmit`, `npm run lint` and `npm run build` pass (the build runs `prebuild`, so the assets must copy cleanly)
    - `git diff --stat -- src/core src/analyzers src/pipeline src/server src/app/api` shows no changes
    - Grep: no `NEXT_PUBLIC_` added; no path alias imports in new files; `package.json` pins the six packages exactly
    - Re-read the original brief and confirm every item (scope 1 to 6, property list, example tests) maps to a requirement and a passing test, and list anything that could only be checked manually
    - _Requirements: REQ-CI-51, REQ-CI-56 to REQ-CI-60_
  - [x] 9.2 Update steering text that names the old libraries
    - In `.kiro/steering/tech.md` change the OCR row to Tesseract.js 7.0.0 and the QR row to zxing-wasm 3.1.6; in `.kiro/steering/privacy-and-safety.md` replace "jsQR" in the dependency hygiene line with "zxing-wasm"
    - Documentation only; confirm with the user first if they did not approve the library choice
    - _Requirements: REQ-CI-51_

## Notes

- Each task references specific requirements for traceability.
- Property tests validate the universal properties PBT-47 to PBT-58 from the requirements.
- Sub-tasks are not marked optional: tests ship with their implementation.
- Task 7.2 is manual because no real browser is available to the test suite; the design lists which assumptions it settles.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "2.1", "2.4", "2.8"] },
    { "id": 2, "tasks": ["1.4", "1.5", "2.2", "2.3", "2.5", "2.6"] },
    { "id": 3, "tasks": ["2.7", "4.1", "4.3", "4.5", "4.9"] },
    { "id": 4, "tasks": ["4.2", "4.4", "4.6", "4.10", "4.7"] },
    { "id": 5, "tasks": ["4.8", "4.11", "5.1"] },
    { "id": 6, "tasks": ["5.2", "7.1"] },
    { "id": 7, "tasks": ["7.2", "8.1"] },
    { "id": 8, "tasks": ["9.1", "9.2"] }
  ]
}
